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

