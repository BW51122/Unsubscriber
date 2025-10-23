/**
 * Backend Health Check Service
 * FR-2.1.3: Persistent heartbeat check every 5 seconds
 * Displays critical error after 3 consecutive failures
 */

import axios from 'axios';
import { BrowserWindow } from 'electron';
import { HealthCheckStatus } from '../../shared/types';
import { APP_CONSTANTS, ERROR_MESSAGES } from '../../shared/constants';
import { BackendManager } from './backend-manager';
import { logger } from '../utils/logger';

export class HealthCheckService {
  private backendManager: BackendManager;
  private intervalId: NodeJS.Timeout | null = null;
  private status: HealthCheckStatus = {
    isHealthy: true,
    consecutiveFailures: 0,
    lastCheck: null,
    error: null,
  };
  private isRunning = false;
  private mainWindow: BrowserWindow | null = null;

  constructor(backendManager: BackendManager) {
    this.backendManager = backendManager;
  }

  /**
   * Set the main window reference for displaying error dialogs
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Start the health check monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Health check is already running');
      return;
    }

    logger.info('Starting health check service', {
      interval: APP_CONSTANTS.HEALTH_CHECK_INTERVAL_MS,
      failureThreshold: APP_CONSTANTS.HEALTH_CHECK_FAILURE_THRESHOLD,
    });

    this.isRunning = true;
    this.status.consecutiveFailures = 0;
    this.status.isHealthy = true;

    // Perform immediate check
    this.performCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, APP_CONSTANTS.HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the health check monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping health check service');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform a single health check
   */
  private async performCheck(): Promise<void> {
    const baseUrl = this.backendManager.getBaseUrl();

    if (!baseUrl) {
      this.handleFailure('Backend URL not available');
      return;
    }

    try {
      // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
      const healthUrl = baseUrl.replace('localhost', '127.0.0.1');
      const response = await axios.get(
        `${healthUrl}${APP_CONSTANTS.BACKEND_HEALTH_ENDPOINT}`,
        {
          timeout: APP_CONSTANTS.HEALTH_CHECK_TIMEOUT_MS,
          validateStatus: (status) => status === 200,
        }
      );

      if (response.data.status === 'healthy') {
        this.handleSuccess();
      } else {
        this.handleFailure('Backend reported unhealthy status');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.handleFailure(`Health check request failed: ${errorMessage}`);
    }
  }

  /**
   * Handle successful health check
   */
  private handleSuccess(): void {
    const wasUnhealthy = !this.status.isHealthy;

    this.status.isHealthy = true;
    this.status.consecutiveFailures = 0;
    this.status.lastCheck = Date.now();
    this.status.error = null;

    if (wasUnhealthy) {
      logger.info('Backend recovered, health check passed');
    } else {
      logger.debug('Health check passed');
    }

    // Notify renderer process
    this.notifyRenderer();
  }

  /**
   * Handle failed health check
   */
  private handleFailure(error: string): void {
    this.status.consecutiveFailures++;
    this.status.lastCheck = Date.now();
    this.status.error = error;

    logger.warn('Health check failed', {
      consecutiveFailures: this.status.consecutiveFailures,
      error,
    });

    // Check if we've exceeded the failure threshold
    if (this.status.consecutiveFailures >= APP_CONSTANTS.HEALTH_CHECK_FAILURE_THRESHOLD) {
      this.status.isHealthy = false;
      this.handleCriticalFailure();
    }

    // Notify renderer process
    this.notifyRenderer();
  }

  /**
   * Handle critical failure (3+ consecutive failures)
   * FR-2.1.3: Display critical error modal and disable UI
   */
  private handleCriticalFailure(): void {
    logger.error('Critical health check failure - threshold exceeded', {
      consecutiveFailures: this.status.consecutiveFailures,
      threshold: APP_CONSTANTS.HEALTH_CHECK_FAILURE_THRESHOLD,
    });

    // Stop monitoring since we're in a critical state
    this.stop();

    // Show error dialog to user
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      const { dialog } = require('electron');
      
      dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        title: 'Critical Error',
        message: ERROR_MESSAGES.BACKEND_CRASHED,
        buttons: ['OK'],
        defaultId: 0,
      }).then(() => {
        // Notify renderer to disable all UI elements
        this.notifyRenderer();
      });
    }
  }

  /**
   * Notify renderer process of status change
   */
  private notifyRenderer(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('health:status', this.getStatus());
    }
  }

  /**
   * Get current health check status
   */
  getStatus(): HealthCheckStatus {
    return { ...this.status };
  }

  /**
   * Check if the service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

