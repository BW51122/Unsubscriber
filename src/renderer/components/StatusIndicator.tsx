/**
 * Status Indicator Component
 * Displays backend and health check status
 */

import React from 'react';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { useHealthCheck } from '../hooks/useHealthCheck';
import '../styles/StatusIndicator.css';

export const StatusIndicator: React.FC = () => {
  const { status: backendStatus, isLoading } = useBackendStatus();
  const healthStatus = useHealthCheck();

  const getStatusColor = () => {
    if (isLoading) return '#808080'; // Gray
    if (!backendStatus.isRunning) return '#dc3545'; // Red
    if (!healthStatus.isHealthy) return '#dc3545'; // Red
    return '#28a745'; // Green
  };

  const getStatusText = () => {
    if (isLoading) return 'Initializing...';
    if (!backendStatus.isRunning) return 'Backend Offline';
    if (!healthStatus.isHealthy) return 'Backend Unhealthy';
    return 'Backend Running';
  };

  return (
    <div className="status-indicator">
      <div 
        className="status-dot" 
        style={{ backgroundColor: getStatusColor() }}
      />
      <span className="status-text">{getStatusText()}</span>
      {backendStatus.port && (
        <span className="status-detail">Port: {backendStatus.port}</span>
      )}
      {!healthStatus.isHealthy && healthStatus.error && (
        <span className="status-error" title={healthStatus.error}>
          ⚠️
        </span>
      )}
    </div>
  );
};

