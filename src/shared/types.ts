/**
 * Shared type definitions for IPC communication between Main and Renderer processes
 */

export enum IPCChannel {
  // Backend Management
  BACKEND_STATUS = 'backend:status',
  BACKEND_PORT = 'backend:port',
  
  // Window Management
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_CLOSE = 'window:close',
  WINDOW_SHOW = 'window:show',
  
  // System Checks
  SYSTEM_CHECK_TIME = 'system:check-time',
  SYSTEM_CHECK_FILESYSTEM = 'system:check-filesystem',
  
  // Health Check
  HEALTH_CHECK_START = 'health:start',
  HEALTH_CHECK_STOP = 'health:stop',
  HEALTH_STATUS = 'health:status',
  
  // Account Management (Phase 1.2)
  ACCOUNTS_LIST = 'accounts:list',
  ACCOUNTS_ADD_START = 'accounts:add:start',
  ACCOUNTS_ADD_COMPLETE = 'accounts:add:complete',
  ACCOUNTS_DELETE = 'accounts:delete',
  ACCOUNTS_REFRESH_TOKEN = 'accounts:refresh-token',
  ACCOUNTS_UPDATED = 'accounts:updated',
}

export interface BackendStatus {
  isRunning: boolean;
  port: number | null;
  pid: number | null;
  error: string | null;
}

export interface HealthCheckStatus {
  isHealthy: boolean;
  consecutiveFailures: number;
  lastCheck: number | null;
  error: string | null;
}

export interface SystemTimeCheckResult {
  isValid: boolean;
  systemTime: number;
  networkTime: number | null;
  discrepancyMs: number;
  error: string | null;
}

export interface FilesystemCheckResult {
  isWritable: boolean;
  dataDirectory: string;
  error: string | null;
}

export interface AppConfig {
  dataDirectory: string;
  backendScriptPath: string;
  healthCheckInterval: number;
  healthCheckFailureThreshold: number;
  maxSystemTimeDiscrepancyMs: number;
}

export enum AppErrorCode {
  BACKEND_CRASHED = 'BACKEND_CRASHED',
  FILESYSTEM_NOT_WRITABLE = 'FILESYSTEM_NOT_WRITABLE',
  SYSTEM_TIME_INVALID = 'SYSTEM_TIME_INVALID',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
}

export interface AppError {
  code: AppErrorCode;
  message: string;
  details?: unknown;
  timestamp: number;
}

// Phase 1.2: Account Management Types

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  tokenType: string;
}

export interface Account {
  id: number;
  email: string;
  displayName: string | null;
  addedTimestamp: string;
  lastSyncTimestamp: string | null;
  isRealtimeEnabled: boolean;
  status: 'active' | 'error' | 'revoked' | 'disabled';
  pendingSubscriptionsCount: number;
}

export interface OAuthFlowResult {
  account: Account;
  tokens: TokenData;
}

export interface AccountDeleteConfirmation {
  email: string;
}
