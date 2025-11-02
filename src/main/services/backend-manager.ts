/**
 * Python Backend Process Manager
 * FR-2.1.2: Launch embedded Python backend as hidden child process
 * FR-2.1.4: Dynamic port allocation
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { app } from 'electron';
import axios from 'axios';
import { BackendStatus } from '../../shared/types';
import { APP_CONSTANTS } from '../../shared/constants';
import { logger } from '../utils/logger';

export class BackendManager {
  private process: ChildProcess | null = null;
  private port: number | null = null;
  private isRunning = false;
  private startupPromise: Promise<BackendStatus> | null = null;

  /**
   * Get the path to the Python backend script
   */
  private getBackendScriptPath(): string {
    if (app.isPackaged) {
      // In production, backend is bundled with the app
      return path.join(process.resourcesPath, 'backend', 'main.py');
    } else {
      // In development
      return path.join(app.getAppPath(), 'backend', 'main.py');
    }
  }

  /**
   * Get the Python executable path
   * In production, we'll bundle Python with the app
   */
  private getPythonExecutable(): string {
    if (app.isPackaged) {
      // TODO: Will need to bundle Python interpreter for production
      return 'python';
    } else {
      // In development, use system Python or venv
      return process.platform === 'win32' ? 'python' : 'python3';
    }
  }

  /**
   * Start the Python backend process
   * The backend will find an available port and communicate it back
   */
  async start(): Promise<BackendStatus> {
    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = this._startInternal();
    return this.startupPromise;
  }

  private async _startInternal(): Promise<BackendStatus> {
    logger.info('Starting Python backend');

    if (this.isRunning) {
      logger.warn('Backend is already running');
      return this.getStatus();
    }

    const scriptPath = this.getBackendScriptPath();
    const pythonExe = this.getPythonExecutable();

    try {
      // Spawn the Python process
      this.process = spawn(pythonExe, [scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true, // Hide console window on Windows
        cwd: path.dirname(scriptPath), // Set working directory to backend folder
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1', // Disable Python output buffering
        },
      });

      // Capture process ID
      const pid = this.process.pid || null;
      logger.info('Backend process spawned', { pid });

      // Set up output handlers
      this.process.stdout?.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        logger.debug('Backend stdout', { output });

        // Look for port announcement: "PORT:12345"
        const portMatch = output.match(/PORT:(\d+)/);
        if (portMatch) {
          this.port = parseInt(portMatch[1], 10);
          logger.info('Backend port received', { port: this.port });
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        logger.error('Backend stderr', { error });
      });

      this.process.on('close', (code: number | null) => {
        logger.warn('Backend process closed', { code });
        this.isRunning = false;
        this.port = null;
        this.process = null;
      });

      this.process.on('error', (error: Error) => {
        logger.error('Backend process error', error);
        this.isRunning = false;
        this.port = null;
      });

      // Wait for port announcement with timeout
      const port = await this.waitForPort();
      this.isRunning = true;

      // Verify backend is responding
      await this.waitForHealthy();

      const status: BackendStatus = {
        isRunning: true,
        port,
        pid,
        error: null,
      };

      logger.info('Backend started successfully', status);
      return status;
    } catch (error) {
      logger.error('Failed to start backend', error);
      
      const status: BackendStatus = {
        isRunning: false,
        port: null,
        pid: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return status;
    } finally {
      this.startupPromise = null;
    }
  }

  /**
   * Wait for the backend to announce its port
   */
  private waitForPort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Backend did not announce port within timeout'));
      }, APP_CONSTANTS.BACKEND_STARTUP_TIMEOUT_MS);

      const checkInterval = setInterval(() => {
        if (this.port !== null) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve(this.port);
        }
      }, 100);
    });
  }

  /**
   * Wait for backend health endpoint to respond
   */
  private async waitForHealthy(): Promise<void> {
    if (!this.port) {
      throw new Error('Cannot check health: port not available');
    }

    const startTime = Date.now();
    const maxWaitTime = APP_CONSTANTS.BACKEND_STARTUP_TIMEOUT_MS;
    const healthUrl = `http://127.0.0.1:${this.port}${APP_CONSTANTS.BACKEND_HEALTH_ENDPOINT}`;

    logger.info(`Waiting for backend health check at ${healthUrl}`);

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(healthUrl, { timeout: 2000 });

        if (response.data.status === 'healthy') {
          logger.info('Backend is healthy!');
          return;
        }
      } catch (error) {
        // Backend not ready yet, wait and retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    throw new Error('Backend did not become healthy within timeout');
  }

  /**
   * Stop the backend process
   */
  async stop(): Promise<void> {
    logger.info('Stopping Python backend');

    if (this.process) {
      return new Promise((resolve) => {
        if (!this.process) {
          resolve();
          return;
        }

        this.process.once('close', () => {
          logger.info('Backend process terminated');
          this.isRunning = false;
          this.port = null;
          this.process = null;
          resolve();
        });

        // Try graceful shutdown first
        this.process.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (this.process) {
            logger.warn('Force killing backend process');
            this.process.kill('SIGKILL');
          }
        }, 5000);
      });
    }
  }

  /**
   * Get current backend status
   */
  getStatus(): BackendStatus {
    return {
      isRunning: this.isRunning,
      port: this.port,
      pid: this.process?.pid || null,
      error: null,
    };
  }

  /**
   * Get the backend URL
   */
  getBaseUrl(): string | null {
    return this.port ? `http://127.0.0.1:${this.port}` : null;
  }
}

