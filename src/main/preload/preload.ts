/**
 * Preload Script
 * Provides secure bridge between Renderer and Main processes
 * Context Isolation ensures renderer cannot access Node.js directly
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Define types locally to avoid import issues
type BackendStatus = {
  isRunning: boolean;
  port: number | null;
  pid: number | null;
  error: string | null;
};

type HealthCheckStatus = {
  isHealthy: boolean;
  consecutiveFailures: number;
  lastCheck: number | null;
  error: string | null;
};

type SystemTimeCheckResult = {
  isValid: boolean;
  systemTime: number;
  networkTime: number | null;
  discrepancyMs: number;
  error: string | null;
};

type FilesystemCheckResult = {
  isWritable: boolean;
  dataDirectory: string;
  error: string | null;
};

// Account types for Phase 1.2
type Account = {
  id: number;
  email: string;
  displayName: string | null;
  addedTimestamp: string;
  lastSyncTimestamp: string | null;
  isRealtimeEnabled: boolean;
  status: string;
  pendingSubscriptionsCount: number;
};

type OAuthFlowResult = {
  account: Account;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
    tokenType: string;
  };
};

// Define the API that will be exposed to the renderer
const electronAPI = {
  // Backend Management
  getBackendStatus: (): Promise<BackendStatus> => 
    ipcRenderer.invoke('backend:status'),

  // Health Check
  onHealthStatus: (callback: (status: HealthCheckStatus) => void) => {
    const subscription = (_event: IpcRendererEvent, status: HealthCheckStatus) => callback(status);
    ipcRenderer.on('health:status', subscription);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener('health:status', subscription);
    };
  },

  // Window Management
  minimizeWindow: (): void => 
    ipcRenderer.send('window:minimize'),
  
  closeWindow: (): void => 
    ipcRenderer.send('window:close'),

  // System Checks
  checkSystemTime: (): Promise<SystemTimeCheckResult> => 
    ipcRenderer.invoke('system:check-time'),
  
  checkFilesystem: (): Promise<FilesystemCheckResult> => 
    ipcRenderer.invoke('system:check-filesystem'),

  // Application Info
  getAppVersion: (): Promise<string> => 
    ipcRenderer.invoke('app:version'),
  
  getAppPath: (): Promise<string> => 
    ipcRenderer.invoke('app:path'),
  
  // Account Management (Phase 1.2)
  getAccounts: (): Promise<Account[]> => 
    ipcRenderer.invoke('accounts:list'),
  
  startAddAccount: (): Promise<{ authUrl: string; state: string }> => 
    ipcRenderer.invoke('accounts:add:start'),
  
  completeAddAccount: (state: string): Promise<OAuthFlowResult> => 
    ipcRenderer.invoke('accounts:add:complete', state),
  
  deleteAccount: (email: string): Promise<{ success: boolean }> => 
    ipcRenderer.invoke('accounts:delete', email),
  
  onAccountsUpdated: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('accounts:updated', subscription);
    
    return () => {
      ipcRenderer.removeListener('accounts:updated', subscription);
    };
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for TypeScript in renderer
export type ElectronAPI = typeof electronAPI;

