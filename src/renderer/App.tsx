/**
 * Main Application Component
 * Root component for the renderer process
 */

import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { StatusIndicator } from './components/StatusIndicator';
import './styles/App.css';

const App: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    // Fetch app version on mount
    window.electronAPI.getAppVersion().then(setAppVersion);
  }, []);

  return (
    <div className="app">
      <TitleBar />
      
      <div className="app-container">
        <header className="app-header">
          <h1>Unsubscriber</h1>
          <p className="app-subtitle">AI-Powered Email Subscription Manager</p>
          {appVersion && <span className="app-version">v{appVersion}</span>}
        </header>

        <main className="app-main">
          <div className="status-section">
            <h2>System Status</h2>
            <StatusIndicator />
          </div>

          <div className="info-section">
            <div className="info-card">
              <h3>📧 Account Management</h3>
              <p>Connect your Gmail accounts to get started.</p>
              <button className="primary-button" disabled>
                Add Account (Coming Soon)
              </button>
            </div>

            <div className="info-card">
              <h3>🔍 Full Check</h3>
              <p>Scan your entire inbox for unwanted subscriptions.</p>
              <button className="primary-button" disabled>
                Run Full Check (Coming Soon)
              </button>
            </div>

            <div className="info-card">
              <h3>⚡ Real-Time Monitoring</h3>
              <p>Automatically detect new subscriptions as emails arrive.</p>
              <button className="primary-button" disabled>
                Enable Real-Time (Coming Soon)
              </button>
            </div>
          </div>

          <div className="welcome-message">
            <h3>Welcome to Unsubscriber!</h3>
            <p>
              The application skeleton has been successfully initialized.
              The Python backend is running and ready to receive commands.
            </p>
            <p className="note">
              📝 <strong>Phase 1.1 Complete:</strong> Core infrastructure is in place.
              Additional features will be implemented in subsequent phases.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

