/**
 * TypeScript declarations for Electron API exposed via preload
 */

import { ElectronAPI } from '../../main/preload/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};

