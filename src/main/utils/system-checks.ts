/**
 * System validation checks performed on application startup
 * FR-2.1.5: System Time Check
 * FR-2.1.6: Filesystem Permissions Check
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { app } from 'electron';
import { SystemTimeCheckResult, FilesystemCheckResult } from '../../shared/types';
import { APP_CONSTANTS } from '../../shared/constants';
import { logger } from './logger';

export class SystemChecks {
  /**
   * Check system time against network time server
   * FR-2.1.5: Verify system time is within 5 minutes of actual time
   */
  static async checkSystemTime(): Promise<SystemTimeCheckResult> {
    logger.info('Starting system time check');
    
    const systemTime = Date.now();
    
    try {
      const response = await axios.get(
        `http://${APP_CONSTANTS.NETWORK_TIME_SERVER}/api/timezone/Etc/UTC`,
        { timeout: APP_CONSTANTS.SYSTEM_TIME_CHECK_TIMEOUT_MS }
      );
      
      const networkTime = new Date(response.data.datetime).getTime();
      const discrepancyMs = Math.abs(systemTime - networkTime);
      const isValid = discrepancyMs <= APP_CONSTANTS.MAX_SYSTEM_TIME_DISCREPANCY_MS;
      
      const result: SystemTimeCheckResult = {
        isValid,
        systemTime,
        networkTime,
        discrepancyMs,
        error: null,
      };
      
      if (!isValid) {
        logger.warn('System time check failed', {
          discrepancyMinutes: Math.floor(discrepancyMs / 60000),
        });
      } else {
        logger.info('System time check passed', {
          discrepancyMs,
        });
      }
      
      return result;
    } catch (error) {
      logger.error('System time check encountered an error', error);
      
      // If we can't reach the time server, we allow the app to continue
      // This prevents false positives when offline
      return {
        isValid: true, // Assume valid if we can't check
        systemTime,
        networkTime: null,
        discrepancyMs: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check filesystem write permissions in data directory
   * FR-2.1.6: Verify we can write to our data directory
   */
  static async checkFilesystemPermissions(): Promise<FilesystemCheckResult> {
    logger.info('Starting filesystem permissions check');
    
    const dataDirectory = app.getPath('userData');
    const testFilePath = path.join(dataDirectory, '.write-test');
    
    try {
      // Ensure directory exists
      if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, { recursive: true });
      }
      
      // Try to write a test file
      const testContent = `Unsubscriber write test - ${Date.now()}`;
      fs.writeFileSync(testFilePath, testContent, 'utf8');
      
      // Verify we can read it back
      const readContent = fs.readFileSync(testFilePath, 'utf8');
      
      if (readContent !== testContent) {
        throw new Error('Write verification failed: content mismatch');
      }
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
      
      logger.info('Filesystem permissions check passed', { dataDirectory });
      
      return {
        isWritable: true,
        dataDirectory,
        error: null,
      };
    } catch (error) {
      logger.error('Filesystem permissions check failed', {
        dataDirectory,
        error,
      });
      
      return {
        isWritable: false,
        dataDirectory,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Run all startup checks
   */
  static async runStartupChecks(): Promise<{
    timeCheck: SystemTimeCheckResult;
    filesystemCheck: FilesystemCheckResult;
  }> {
    logger.info('Running all startup checks');
    
    const [timeCheck, filesystemCheck] = await Promise.all([
      this.checkSystemTime(),
      this.checkFilesystemPermissions(),
    ]);
    
    return { timeCheck, filesystemCheck };
  }
}

