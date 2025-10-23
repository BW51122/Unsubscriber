/**
 * Custom Title Bar Component
 * Provides window controls
 */

import React from 'react';
import '../styles/TitleBar.css';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="title-bar">
      <div className="title-bar-title">
        <span className="app-name">Unsubscriber</span>
      </div>
      <div className="title-bar-controls">
        <button 
          className="title-bar-button minimize-button" 
          onClick={handleMinimize}
          title="Minimize"
        >
          −
        </button>
        <button 
          className="title-bar-button close-button" 
          onClick={handleClose}
          title="Close (app will continue in system tray)"
        >
          ×
        </button>
      </div>
    </div>
  );
};

