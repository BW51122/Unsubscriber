/**
 * Application-wide constants
 */

export const APP_CONSTANTS = {
  // Application
  APP_NAME: 'Unsubscriber',
  APP_VERSION: '1.0.0',
  
  // Backend
  BACKEND_STARTUP_TIMEOUT_MS: 30000, // 30 seconds
  BACKEND_HEALTH_ENDPOINT: '/health',
  BACKEND_PORT_RANGE_START: 50000,
  BACKEND_PORT_RANGE_END: 50100,
  
  // Health Check
  HEALTH_CHECK_INTERVAL_MS: 5000, // 5 seconds
  HEALTH_CHECK_FAILURE_THRESHOLD: 3,
  HEALTH_CHECK_TIMEOUT_MS: 3000, // 3 seconds per check
  
  // System Checks
  MAX_SYSTEM_TIME_DISCREPANCY_MS: 5 * 60 * 1000, // 5 minutes
  SYSTEM_TIME_CHECK_TIMEOUT_MS: 5000,
  
  // Window
  WINDOW_MIN_WIDTH: 1000,
  WINDOW_MIN_HEIGHT: 700,
  WINDOW_DEFAULT_WIDTH: 1200,
  WINDOW_DEFAULT_HEIGHT: 800,
  
  // Network
  NETWORK_TIME_SERVER: 'worldtimeapi.org',
} as const;

export const ERROR_MESSAGES = {
  BACKEND_CRASHED: 'A core component has stopped working. Please restart the application.',
  FILESYSTEM_NOT_WRITABLE: 'UNSUBSCRIBER cannot write to its data directory. Please check your system\'s folder permissions.',
  SYSTEM_TIME_INVALID: 'Your computer\'s clock appears to be incorrect. This may prevent you from connecting to your Google account.',
  HEALTH_CHECK_FAILED: 'Backend health check has failed multiple times.',
} as const;

