/**
 * Main Application Component
 * Root component for the renderer process
 */

import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { StatusIndicator } from './components/StatusIndicator';
import { AccountSidebar } from './components/AccountSidebar';
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
        <AccountSidebar />
        
        <div className="app-main-content">
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
              <h3>Phase 1.2 Complete: Gmail Authentication</h3>
              <p>
                You can now connect Gmail accounts using secure OAuth 2.0 authentication.
                Tokens are stored securely in your operating system's credential manager.
              </p>
              <p className="note">
                📝 <strong>What's working:</strong> Account management with OAuth 2.0, secure token storage, 
                and account synchronization. Next phase will add AI email analysis capabilities.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;

