/**
 * React hook for monitoring backend status
 */

import { useState, useEffect } from 'react';
import { BackendStatus } from '../../shared/types';

export const useBackendStatus = () => {
  const [status, setStatus] = useState<BackendStatus>({
    isRunning: false,
    port: null,
    pid: null,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const backendStatus = await window.electronAPI.getBackendStatus();
        setStatus(backendStatus);
      } catch (error) {
        console.error('Failed to fetch backend status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    
    // Poll for status updates every 10 seconds
    const interval = setInterval(fetchStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return { status, isLoading };
};

