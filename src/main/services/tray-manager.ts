/**
 * System Tray Management Service
 * FR-2.2.1-4: System tray integration with icon and context menu
 */

import { app, Menu, nativeImage, Tray } from 'electron';
import * as path from 'path';
import { WindowManager } from './window-manager';
import { logger } from '../utils/logger';

export class TrayManager {
  private tray: Tray | null = null;
  private windowManager: WindowManager;

  constructor(windowManager: WindowManager) {
    this.windowManager = windowManager;
  }

  /**
   * Create and configure the system tray icon
   */
  createTray(): void {
    logger.info('Creating system tray icon');

    // Get the tray icon path
    const iconPath = this.getTrayIconPath();
    
    // Create native image from icon
    const icon = nativeImage.createFromPath(iconPath);
    
    // Resize for tray (platform-specific sizing)
    const resizedIcon = icon.resize({
      width: 16,
      height: 16,
    });

    // Create tray
    this.tray = new Tray(resizedIcon);
    this.tray.setToolTip('Unsubscriber');

    // FR-2.2.2: Single left-click shows window
    this.tray.on('click', () => {
      logger.debug('Tray icon clicked');
      this.windowManager.showWindow();
    });

    // FR-2.2.3-4: Right-click shows context menu
    this.setupContextMenu();

    logger.info('System tray created successfully');
  }

  /**
   * Get the appropriate tray icon path based on platform
   */
  private getTrayIconPath(): string {
    const iconName = process.platform === 'darwin' ? 'tray-icon-mac.png' : 'tray-icon.png';
    
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'assets', iconName);
    } else {
      // For development, create a simple icon in the assets directory
      return path.join(app.getAppPath(), 'assets', iconName);
    }
  }

  /**
   * Set up the tray context menu
   * FR-2.2.3-4: Show and Quit options
   */
  private setupContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          logger.debug('Tray menu: Show clicked');
          this.windowManager.showWindow();
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Quit',
        click: () => {
          logger.info('Tray menu: Quit clicked');
          this.quitApplication();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * FR-2.2.4: Quit completely terminates both Electron and Python backend
   */
  private quitApplication(): void {
    logger.info('Quitting application from tray');
    
    // Set the quitting flag so the window actually closes
    this.windowManager.setQuitting(true);
    
    // Quit the app (this will trigger the before-quit event in main.ts)
    app.quit();
  }

  /**
   * Update the tray tooltip
   */
  setTooltip(tooltip: string): void {
    if (this.tray) {
      this.tray.setToolTip(tooltip);
    }
  }

  /**
   * Destroy the tray icon
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      logger.info('System tray destroyed');
    }
  }
}

