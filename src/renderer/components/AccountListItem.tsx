/**
 * Account List Item Component
 * SRS FR-3.1.2: Composite component with Status Circle, Email, Remove Button
 */

import React from 'react';
import '../styles/AccountListItem.css';

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

interface AccountListItemProps {
  account: Account;
  onDelete: (email: string) => void;
}

export const AccountListItem: React.FC<AccountListItemProps> = ({ account, onDelete }) => {
  /**
   * Get status indicator color based on SRS FR-3.1.5
   * Gray: Real-time disabled
   * Green: Real-time enabled AND no pending items
   * Red: Real-time enabled AND has pending items
   */
  const getStatusColor = (): string => {
    if (!account.isRealtimeEnabled) {
      return '#808080'; // Gray
    }
    
    if (account.pendingSubscriptionsCount > 0) {
      return '#dc3545'; // Red
    }
    
    return '#28a745'; // Green
  };

  const handleDelete = () => {
    onDelete(account.email);
  };

  return (
    <div className="account-list-item">
      <div 
        className="account-status-circle" 
        style={{ backgroundColor: getStatusColor() }}
        title={
          !account.isRealtimeEnabled 
            ? 'Real-time monitoring disabled' 
            : account.pendingSubscriptionsCount > 0
              ? `${account.pendingSubscriptionsCount} pending subscription(s)`
              : 'No pending subscriptions'
        }
      />
      <div className="account-email">{account.email}</div>
      <button 
        className="account-remove-button" 
        onClick={handleDelete}
        title="Remove account"
      >
        ×
      </button>
    </div>
  );
};

