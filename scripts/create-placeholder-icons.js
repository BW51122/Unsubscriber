/**
 * Script to create placeholder tray icons for development
 * Run with: node scripts/create-placeholder-icons.js
 */

const fs = require('fs');
const path = require('path');

// Simple 16x16 PNG (blue square) as base64
const trayIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABSSURBVDiNY2AYBaNgFAwcYGRkZAQSTECMByMYGBj+B8E/BgYGJjQxsHyCGQDTCAY4DcMwYEgYRsEoGAXDBrA0NTVNR2J/RzIIpwFoXkZxwSgYuAAA8IIKoS9C3vMAAAAASUVORK5CYII=';

// Simple 16x16 PNG (black square for macOS) as base64
const trayIconMacBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAjSURBVDiNY2AYBaNgFIwCRkZGRiDBBMQMDAwMTAwjYBSMgqEIAFx+AAP7xJJ0AAAAAElFTkSuQmCC';

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Write tray icon
fs.writeFileSync(
  path.join(assetsDir, 'tray-icon.png'),
  Buffer.from(trayIconBase64, 'base64')
);

// Write tray icon for macOS
fs.writeFileSync(
  path.join(assetsDir, 'tray-icon-mac.png'),
  Buffer.from(trayIconMacBase64, 'base64')
);

console.log('✅ Placeholder tray icons created in assets/ directory');
console.log('   - tray-icon.png (16x16 blue square)');
console.log('   - tray-icon-mac.png (16x16 black square)');
console.log('');
console.log('For production, replace these with proper application icons.');

