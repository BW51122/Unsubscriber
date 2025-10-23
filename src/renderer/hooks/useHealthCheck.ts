/**
 * React hook for monitoring health check status
 */

import { useState, useEffect } from 'react';
import { HealthCheckStatus } from '../../shared/types';

export const useHealthCheck = () => {
  const [status, setStatus] = useState<HealthCheckStatus>({
    isHealthy: true,
    consecutiveFailures: 0,
    lastCheck: null,
    error: null,
  });

  useEffect(() => {
    // Subscribe to health status updates from main process
    const unsubscribe = window.electronAPI.onHealthStatus((healthStatus) => {
      setStatus(healthStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
};

