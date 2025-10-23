/**
 * IPC Handler Registration
 * Central registry for all IPC communication handlers
 */

import { ipcMain, app } from 'electron';
import { IPCChannel } from '../../shared/types';
import { BackendManager } from '../services/backend-manager';
import { WindowManager } from '../services/window-manager';
import { SystemChecks } from '../utils/system-checks';
import { logger } from '../utils/logger';

export class IPCHandlers {
  private backendManager: BackendManager;
  private windowManager: WindowManager;

  constructor(backendManager: BackendManager, windowManager: WindowManager) {
    this.backendManager = backendManager;
    this.windowManager = windowManager;
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

