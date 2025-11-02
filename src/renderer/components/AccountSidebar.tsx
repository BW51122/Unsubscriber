/**
 * Account Sidebar Component
 * SRS FR-3.1.1: Vertical list of connected Gmail accounts
 */

import React, { useState } from 'react';
import { AccountListItem } from './AccountListItem';
import { useAccounts } from '../hooks/useAccounts';
import '../styles/AccountSidebar.css';

export const AccountSidebar: React.FC = () => {
  const { accounts, isLoading, error, addAccount, deleteAccount } = useAccounts();
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [addAccountError, setAddAccountError] = useState<string | null>(null);

  const handleAddAccount = async () => {
    setIsAddingAccount(true);
    setAddAccountError(null);

    try {
      await addAccount();
      // Success - account will appear automatically via subscription
    } catch (err) {
      setAddAccountError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleDeleteAccount = async (email: string) => {
    try {
      await deleteAccount(email);
      // Account will disappear automatically via subscription
    } catch (err) {
      console.error('Failed to delete account:', err);
      // Error already shown in confirmation dialog
    }
  };

  return (
    <div className="account-sidebar">
      <div className="account-sidebar-header">
        <h2>Gmail Accounts</h2>
      </div>

      <div className="account-list">
        {isLoading && (
          <div className="account-list-empty">Loading accounts...</div>
        )}

        {!isLoading && error && (
          <div className="account-list-error">
            <p>Error loading accounts</p>
            <p className="error-detail">{error}</p>
          </div>
        )}

        {!isLoading && !error && accounts.length === 0 && (
          <div className="account-list-empty">
            <p>No accounts connected</p>
            <p className="empty-hint">Click "Add Account" to get started</p>
          </div>
        )}

        {!isLoading && !error && accounts.length > 0 && (
          <>
            {accounts.map((account) => (
              <AccountListItem
                key={account.id}
                account={account}
                onDelete={handleDeleteAccount}
              />
            ))}
          </>
        )}
      </div>

      <div className="account-sidebar-footer">
        {addAccountError && (
          <div className="add-account-error">
            {addAccountError}
          </div>
        )}
        
        <button
          className="add-account-button"
          onClick={handleAddAccount}
          disabled={isAddingAccount}
        >
          {isAddingAccount ? (
            <>
              <span className="spinner"></span>
              Adding Account...
            </>
          ) : (
            <>
              <span className="plus-icon">+</span>
              Add Account
            </>
          )}
        </button>
      </div>
    </div>
  );
};

