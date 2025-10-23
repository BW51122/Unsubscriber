/**
 * Main Process Entry Point
 * Electron Main Process - Orchestrates all services and manages application lifecycle
 */

import { app, dialog } from 'electron';
import { BackendManager } from './services/backend-manager';
import { WindowManager } from './services/window-manager';
import { TrayManager } from './services/tray-manager';
import { HealthCheckService } from './services/health-check';
import { IPCHandlers } from './ipc/ipc-handlers';
import { SystemChecks } from './utils/system-checks';
import { logger } from './utils/logger';
import { ERROR_MESSAGES } from '../shared/constants';

class UnsubscriberApp {
  private backendManager: BackendManager;
  private windowManager: WindowManager;
  private trayManager: TrayManager;
  private healthCheckService: HealthCheckService;
  private ipcHandlers: IPCHandlers;
  private isInitialized = false;

  constructor() {
    this.backendManager = new BackendManager();
    this.windowManager = new WindowManager();
    this.trayManager = new TrayManager(this.windowManager);
    this.healthCheckService = new HealthCheckService(this.backendManager);
    this.ipcHandlers = new IPCHandlers(this.backendManager, this.windowManager);
  }

  /**
   * Initialize and start the application
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Application already initialized');
      return;
    }

    logger.info('Starting Unsubscriber application');

    try {
      // FR-2.1.5 & FR-2.1.6: Run startup checks
      await this.runStartupChecks();

      // FR-2.1.2 & FR-2.1.4: Start Python backend
      await this.startBackend();

      // Create main window
      this.createWindow();

      // FR-2.2.1-4: Create system tray
      this.createTray();

      // FR-2.1.3: Start health check monitoring
      this.startHealthCheck();

      // Register IPC handlers
      this.registerIPCHandlers();

      this.isInitialized = true;
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', error);
      this.showCriticalError(
        'Initialization Failed',
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
      app.quit();
    }
  }

  /**
   * Run all startup system checks
   * FR-2.1.5: System time check
   * FR-2.1.6: Filesystem permissions check
   */
  private async runStartupChecks(): Promise<void> {
    logger.info('Running startup checks');

    const { timeCheck, filesystemCheck } = await SystemChecks.runStartupChecks();

    // FR-2.1.6: Critical error if filesystem is not writable
    if (!filesystemCheck.isWritable) {
      throw new Error(ERROR_MESSAGES.FILESYSTEM_NOT_WRITABLE);
    }

    // FR-2.1.5: Warning if system time is incorrect
    if (!timeCheck.isValid) {
      logger.warn('System time check failed, showing warning');
      
      // Show warning but allow app to continue
      dialog.showMessageBoxSync({
        type: 'warning',
        title: 'System Time Warning',
        message: ERROR_MESSAGES.SYSTEM_TIME_INVALID,
        buttons: ['Continue Anyway'],
      });
    }

    logger.info('Startup checks completed', {
      timeCheck: timeCheck.isValid,
      filesystemCheck: filesystemCheck.isWritable,
    });
  }

  /**
   * Start the Python backend process
   * FR-2.1.2: Launch embedded Python backend
   * FR-2.1.4: Dynamic port allocation
   */
  private async startBackend(): Promise<void> {
    logger.info('Starting backend');

    const status = await this.backendManager.start();

    if (!status.isRunning || status.error) {
      throw new Error(`Failed to start backend: ${status.error || 'Unknown error'}`);
    }

    logger.info('Backend started successfully', {
      port: status.port,
      pid: status.pid,
    });
  }

  /**
   * Create the main application window
   */
  private createWindow(): void {
    const mainWindow = this.windowManager.createMainWindow();
    this.healthCheckService.setMainWindow(mainWindow);
    logger.info('Main window created');
  }

  /**
   * Create the system tray icon
   * FR-2.2.1-4: System tray integration
   */
  private createTray(): void {
    this.trayManager.createTray();
    logger.info('System tray created');
  }

  /**
   * Start the backend health check service
   * FR-2.1.3: Heartbeat check every 5 seconds
   */
  private startHealthCheck(): void {
    this.healthCheckService.start();
    logger.info('Health check service started');
  }

  /**
   * Register all IPC communication handlers
   */
  private registerIPCHandlers(): void {
    this.ipcHandlers.registerAll();
    logger.info('IPC handlers registered');
  }

  /**
   * Show a critical error dialog
   */
  private showCriticalError(title: string, message: string): void {
    dialog.showErrorBox(title, message);
  }

  /**
   * Clean shutdown of all services
   * FR-2.2.4: Quit terminates both Electron and Python backend
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down application');

    try {
      // Stop health check
      this.healthCheckService.stop();

      // Unregister IPC handlers
      this.ipcHandlers.unregisterAll();

      // Destroy tray
      this.trayManager.destroy();

      // Stop backend
      await this.backendManager.stop();

      // Destroy window
      this.windowManager.destroyWindow();

      logger.info('Application shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', error);
    }
  }
}

// ============================================================================
// Application Lifecycle Management
// ============================================================================

const unsubscriberApp = new UnsubscriberApp();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.warn('Another instance is already running');
  app.quit();
} else {
  // If second instance is launched, focus the existing window
  app.on('second-instance', () => {
    logger.info('Second instance detected, focusing main window');
    const windowManager = unsubscriberApp['windowManager'];
    windowManager.showWindow();
  });

  // FR-2.1.1: Start the application when Electron is ready
  app.whenReady().then(async () => {
    await unsubscriberApp.initialize();
  });

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    const windowManager = unsubscriberApp['windowManager'];
    if (!windowManager.isWindowValid()) {
      windowManager.createMainWindow();
    } else {
      windowManager.showWindow();
    }
  });

  // Handle application quit
  app.on('before-quit', async (event) => {
    event.preventDefault();
    logger.info('Before quit event triggered');
    
    await unsubscriberApp.shutdown();
    
    // Allow the app to quit after cleanup
    app.exit(0);
  });

  // Handle all windows closed
  app.on('window-all-closed', () => {
    // On macOS, keep the app running even when all windows are closed
    if (process.platform !== 'darwin') {
      // On other platforms, we still don't quit because of tray
      // User must explicitly quit from tray menu
      logger.info('All windows closed, but app continues running in tray');
    }
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  dialog.showErrorBox(
    'Unexpected Error',
    `An unexpected error occurred: ${error.message}\n\nThe application will now exit.`
  );
  app.quit();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

