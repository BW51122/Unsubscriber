/**
 * IPC Handler Registration
 * Central registry for all IPC communication handlers
 */

import { ipcMain, app, shell, dialog } from 'electron';
import axios from 'axios';
import { IPCChannel, Account, OAuthFlowResult, TokenData } from '../../shared/types';
import { BackendManager } from '../services/backend-manager';
import { WindowManager } from '../services/window-manager';
import { TokenManager } from '../services/token-manager';
import { SystemChecks } from '../utils/system-checks';
import { logger } from '../utils/logger';

export class IPCHandlers {
  private backendManager: BackendManager;
  private windowManager: WindowManager;
  private tokenManager: TokenManager;

  constructor(
    backendManager: BackendManager, 
    windowManager: WindowManager,
    tokenManager: TokenManager
  ) {
    this.backendManager = backendManager;
    this.windowManager = windowManager;
    this.tokenManager = tokenManager;
  }

  /**
   * Register all IPC handlers
   */
  registerAll(): void {
    logger.info('Registering IPC handlers');

    this.registerBackendHandlers();
    this.registerWindowHandlers();
    this.registerSystemCheckHandlers();
    this.registerAppHandlers();
    this.registerAccountHandlers();
  }

  /**
   * Backend-related handlers
   */
  private registerBackendHandlers(): void {
    ipcMain.handle(IPCChannel.BACKEND_STATUS, () => {
      return this.backendManager.getStatus();
    });

    ipcMain.handle(IPCChannel.BACKEND_PORT, () => {
      return this.backendManager.getBaseUrl();
    });
  }

  /**
   * Window management handlers
   */
  private registerWindowHandlers(): void {
    ipcMain.on(IPCChannel.WINDOW_MINIMIZE, () => {
      logger.debug('IPC: Window minimize requested');
      this.windowManager.minimizeWindow();
    });

    ipcMain.on(IPCChannel.WINDOW_CLOSE, () => {
      logger.debug('IPC: Window close requested');
      this.windowManager.hideWindow();
    });

    ipcMain.on(IPCChannel.WINDOW_SHOW, () => {
      logger.debug('IPC: Window show requested');
      this.windowManager.showWindow();
    });
  }

  /**
   * System check handlers
   */
  private registerSystemCheckHandlers(): void {
    ipcMain.handle(IPCChannel.SYSTEM_CHECK_TIME, async () => {
      logger.debug('IPC: System time check requested');
      return await SystemChecks.checkSystemTime();
    });

    ipcMain.handle(IPCChannel.SYSTEM_CHECK_FILESYSTEM, async () => {
      logger.debug('IPC: Filesystem check requested');
      return await SystemChecks.checkFilesystemPermissions();
    });
  }

  /**
   * Application info handlers
   */
  private registerAppHandlers(): void {
    ipcMain.handle('app:version', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:path', () => {
      return app.getAppPath();
    });
  }
  
  /**
   * Account management handlers (Phase 1.2)
   */
  private registerAccountHandlers(): void {
    // Get all accounts
    ipcMain.handle(IPCChannel.ACCOUNTS_LIST, async () => {
      return await this.handleGetAccounts();
    });
    
    // Start OAuth flow
    ipcMain.handle(IPCChannel.ACCOUNTS_ADD_START, async () => {
      return await this.handleStartOAuth();
    });
    
    // Complete OAuth flow
    ipcMain.handle(IPCChannel.ACCOUNTS_ADD_COMPLETE, async (_event, state: string) => {
      return await this.handleCompleteOAuth(state);
    });
    
    // Delete account
    ipcMain.handle(IPCChannel.ACCOUNTS_DELETE, async (_event, email: string) => {
      return await this.handleDeleteAccount(email);
    });
    
    // Refresh token
    ipcMain.handle(IPCChannel.ACCOUNTS_REFRESH_TOKEN, async (_event, email: string) => {
      return await this.handleRefreshToken(email);
    });
  }
  
  /**
   * Get all accounts from backend
   */
  private async handleGetAccounts(): Promise<Account[]> {
    logger.debug('IPC: Get accounts requested');
    
    try {
      const baseUrl = this.backendManager.getBaseUrl();
      if (!baseUrl) {
        throw new Error('Backend not available');
      }
      
      const response = await axios.get(`${baseUrl}/accounts/list`);
      return response.data.accounts;
    } catch (error) {
      logger.error('Failed to get accounts:', error);
      throw error;
    }
  }
  
  /**
   * Start OAuth authorization flow
   * SRS FR-3.1.3
   */
  private async handleStartOAuth(): Promise<{ authUrl: string; state: string }> {
    logger.info('IPC: Starting OAuth flow');
    
    try {
      const baseUrl = this.backendManager.getBaseUrl();
      if (!baseUrl) {
        throw new Error('Backend not available');
      }
      
      // Request auth URL from backend
      const response = await axios.post(`${baseUrl}/accounts/authorize/start`);
      const { auth_url, state } = response.data;
      
      // Open browser with authorization URL
      await shell.openExternal(auth_url);
      
      logger.info('Browser opened with OAuth URL');
      
      return { authUrl: auth_url, state };
    } catch (error) {
      logger.error('Failed to start OAuth flow:', error);
      throw error;
    }
  }
  
  /**
   * Complete OAuth flow - exchange code for tokens
   */
  private async handleCompleteOAuth(state: string): Promise<OAuthFlowResult> {
    logger.info('IPC: Completing OAuth flow');
    
    try {
      const baseUrl = this.backendManager.getBaseUrl();
      if (!baseUrl) {
        throw new Error('Backend not available');
      }
      
      // Complete OAuth on backend (waits for callback, exchanges code)
      const response = await axios.post(
        `${baseUrl}/accounts/authorize/complete?state=${state}`,
        {},
        { timeout: 310000 } // 5min + 10s buffer
      );
      
      const { account, tokens } = response.data;
      
      // Convert snake_case to camelCase
      const tokenData: TokenData = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_at,
        scope: tokens.scope,
        tokenType: tokens.token_type,
      };
      
      // Store tokens securely in OS credential manager
      await this.tokenManager.storeTokens(account.email, tokenData);
      
      // Convert account to proper format
      const accountData: Account = {
        id: account.id,
        email: account.email,
        displayName: account.display_name,
        addedTimestamp: account.added_timestamp,
        lastSyncTimestamp: account.last_sync_timestamp,
        isRealtimeEnabled: account.is_realtime_enabled,
        status: account.status,
        pendingSubscriptionsCount: account.pending_subscriptions_count,
      };
      
      logger.info(`OAuth completed successfully for: ${account.email}`);
      
      // Notify renderer of account update
      this.notifyAccountsUpdated();
      
      return {
        account: accountData,
        tokens: tokenData,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Handle specific HTTP errors
        if (error.response.status === 409) {
          throw new Error('This account has already been added.');
        }
        if (error.response.status === 408) {
          throw new Error('OAuth timeout. Please try again.');
        }
        throw new Error(error.response.data.detail || 'OAuth failed');
      }
      
      logger.error('OAuth completion failed:', error);
      throw error;
    }
  }
  
  /**
   * Delete account and its tokens
   * SRS FR-3.1.4: Remove account with confirmation
   */
  private async handleDeleteAccount(email: string): Promise<{ success: boolean }> {
    logger.info(`IPC: Delete account requested: ${email}`);
    
    try {
      // Show confirmation dialog
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow) {
        throw new Error('Main window not available');
      }
      
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Remove Account',
        message: `Are you sure you want to remove ${email}?`,
        detail: 'All associated history will be permanently deleted.',
        buttons: ['Cancel', 'Remove'],
        defaultId: 0,
        cancelId: 0,
      });
      
      // User cancelled
      if (result.response === 0) {
        logger.info('Account deletion cancelled by user');
        return { success: false };
      }
      
      const baseUrl = this.backendManager.getBaseUrl();
      if (!baseUrl) {
        throw new Error('Backend not available');
      }
      
      // Delete from backend database
      await axios.delete(`${baseUrl}/accounts/${email}`);
      
      // Delete tokens from credential manager
      await this.tokenManager.deleteTokens(email);
      
      logger.info(`Account deleted successfully: ${email}`);
      
      // Notify renderer
      this.notifyAccountsUpdated();
      
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete account ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Refresh access token for an account
   */
  private async handleRefreshToken(email: string): Promise<TokenData> {
    logger.info(`IPC: Refresh token requested for: ${email}`);
    
    try {
      // Get current tokens
      const tokens = await this.tokenManager.getTokens(email);
      if (!tokens) {
        throw new Error('No tokens found for account');
      }
      
      const baseUrl = this.backendManager.getBaseUrl();
      if (!baseUrl) {
        throw new Error('Backend not available');
      }
      
      // Request new token from backend
      const response = await axios.post(
        `${baseUrl}/accounts/${email}/refresh-token`,
        { refresh_token: tokens.refreshToken }
      );
      
      const newTokens: TokenData = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: response.data.expires_at,
        scope: response.data.scope,
        tokenType: response.data.token_type,
      };
      
      // Update stored tokens
      await this.tokenManager.updateAccessToken(
        email,
        newTokens.accessToken,
        newTokens.expiresAt
      );
      
      logger.info(`Token refreshed for: ${email}`);
      
      return newTokens;
    } catch (error) {
      logger.error(`Failed to refresh token for ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Notify renderer that accounts have been updated
   */
  private notifyAccountsUpdated(): void {
    const mainWindow = this.windowManager.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPCChannel.ACCOUNTS_UPDATED);
    }
  }

  /**
   * Unregister all handlers (for cleanup)
   */
  unregisterAll(): void {
    logger.info('Unregistering IPC handlers');

    // Remove all listeners for our channels
    Object.values(IPCChannel).forEach(channel => {
      ipcMain.removeAllListeners(channel);
    });

    ipcMain.removeAllListeners('app:version');
    ipcMain.removeAllListeners('app:path');
  }
}


