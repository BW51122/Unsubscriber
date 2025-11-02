/**
 * React hook for managing accounts
 */

import { useState, useEffect, useCallback } from 'react';

type Account = {
  id: number;
  email: string;
  displayName: string | null;
  addedTimestamp: string;
  lastSyncTimestamp: string | null;
  isRealtimeEnabled: boolean;
  status: string;
  pendingSubscriptionsCount: number;
};

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setError(null);
      const accountsList = await window.electronAPI.getAccounts();
      setAccounts(accountsList);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    
    // Subscribe to account updates
    const unsubscribe = window.electronAPI.onAccountsUpdated(() => {
      fetchAccounts();
    });

    return unsubscribe;
  }, [fetchAccounts]);

  const addAccount = useCallback(async () => {
    try {
      setError(null);
      
      // Start OAuth flow (opens browser)
      const { state } = await window.electronAPI.startAddAccount();
      
      // Wait for OAuth completion (with timeout)
      const result = await window.electronAPI.completeAddAccount(state);
      
      // Manually refetch to ensure UI updates immediately
      await fetchAccounts();
      
      return result;
    } catch (err) {
      console.error('Add account error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add account';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAccounts]);

  const deleteAccount = useCallback(async (email: string) => {
    try {
      setError(null);
      const result = await window.electronAPI.deleteAccount(email);
      
      // Manually refetch if successful
      if (result.success) {
        await fetchAccounts();
      }
      
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete account';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchAccounts]);

  return {
    accounts,
    isLoading,
    error,
    addAccount,
    deleteAccount,
    refetch: fetchAccounts,
  };
};

