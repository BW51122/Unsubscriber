/**
 * Window Management Service
 * FR-2.3.1: Closing window hides it instead of quitting
 * Handles window state and visibility
 */

import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import { APP_CONSTANTS } from '../../shared/constants';
import { logger } from '../utils/logger';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private isQuitting = false;

  /**
   * Create the main application window
   */
  createMainWindow(): BrowserWindow {
    logger.info('Creating main window');

    this.mainWindow = new BrowserWindow({
      width: APP_CONSTANTS.WINDOW_DEFAULT_WIDTH,
      height: APP_CONSTANTS.WINDOW_DEFAULT_HEIGHT,
      minWidth: APP_CONSTANTS.WINDOW_MIN_WIDTH,
      minHeight: APP_CONSTANTS.WINDOW_MIN_HEIGHT,
      show: false, // Don't show until ready
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      title: APP_CONSTANTS.APP_NAME,
    });

    // Set up window event handlers
    this.setupWindowEvents();

    // Load the renderer
    this.loadRenderer();

    return this.mainWindow;
  }

  /**
   * Set up window event handlers
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // FR-2.3.1: Prevent window close from quitting the app
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting && this.mainWindow && !this.mainWindow.isDestroyed()) {
        event.preventDefault();
        this.hideWindow();
        logger.info('Main window hidden (not closed)');
      }
    });

    // Clean up on window destroy
    this.mainWindow.on('closed', () => {
      logger.info('Main window closed');
      this.mainWindow = null;
    });

    // Show window when ready to avoid visual flash
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        logger.info('Main window shown');
      }
    });
  }

  /**
   * Load the renderer process
   */
  private loadRenderer(): void {
    if (!this.mainWindow) return;

    if (app.isPackaged) {
      // Production: load built files
      const indexPath = path.join(__dirname, '../renderer/index.html');
      this.mainWindow.loadFile(indexPath);
    } else {
      // Development: load from Vite dev server
      this.mainWindow.loadURL('http://localhost:5173');
      
      // Open DevTools in development
      this.mainWindow.webContents.openDevTools();
    }
  }

  /**
   * Show the main window
   */
  showWindow(): void {
    if (!this.mainWindow) {
      this.createMainWindow();
      return;
    }

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }

    this.mainWindow.show();
    this.mainWindow.focus();
    logger.debug('Main window shown and focused');
  }

  /**
   * Hide the main window
   */
  hideWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.hide();
      logger.debug('Main window hidden');
    }
  }

  /**
   * Minimize the main window
   */
  minimizeWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.minimize();
      logger.debug('Main window minimized');
    }
  }

  /**
   * Get the main window instance
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Set the quitting flag
   * When true, closing the window will actually quit the app
   */
  setQuitting(value: boolean): void {
    this.isQuitting = value;
    logger.debug('Quitting flag set', { isQuitting: value });
  }

  /**
   * Check if window exists and is not destroyed
   */
  isWindowValid(): boolean {
    return this.mainWindow !== null && !this.mainWindow.isDestroyed();
  }

  /**
   * Destroy the window and clean up
   */
  destroyWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.destroy();
      this.mainWindow = null;
      logger.info('Main window destroyed');
    }
  }
}

