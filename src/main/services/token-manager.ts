/**
 * Token Manager Service
 * Securely stores OAuth tokens using OS credential manager
 * SRS NFR-1.1: Tokens stored in secure OS credential manager
 */

import { safeStorage } from 'electron';
import Store from 'electron-store';
import { TokenData } from '../../shared/types';
import { logger } from '../utils/logger';

interface StoredTokenData {
  encrypted: string;  // Base64 encoded encrypted data
  email: string;
  updatedAt: number;
}

export class TokenManager {
  private store: Store<Record<string, StoredTokenData>>;
  
  constructor() {
    this.store = new Store({
      name: 'tokens',
      encryptionKey: 'unsubscriber-tokens',  // Additional layer
    });
    
    logger.info('Token manager initialized');
  }
  
  /**
   * Store tokens securely for an account
   * SRS NFR-1.1: Uses OS credential manager encryption
   * 
   * @param email Account email address
   * @param tokens Token data to store
   */
  async storeTokens(email: string, tokens: TokenData): Promise<void> {
    logger.info(`Storing tokens for account: ${email}`);
    
    try {
      // Serialize tokens to JSON
      const tokensJson = JSON.stringify(tokens);
      
      // Encrypt using OS credential manager
      // Windows: Uses DPAPI
      // macOS: Uses Keychain
      // Linux: Uses libsecret
      const encrypted = safeStorage.encryptString(tokensJson);
      
      // Convert to base64 for storage
      const encryptedBase64 = encrypted.toString('base64');
      
      // Store encrypted data
      this.store.set(this.getTokenKey(email), {
        encrypted: encryptedBase64,
        email,
        updatedAt: Date.now(),
      });
      
      logger.info(`Tokens stored successfully for: ${email}`);
    } catch (error) {
      logger.error(`Failed to store tokens for ${email}:`, error);
      throw new Error(`Token storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Retrieve tokens for an account
   * 
   * @param email Account email address
   * @returns Token data if found, null otherwise
   */
  async getTokens(email: string): Promise<TokenData | null> {
    logger.debug(`Retrieving tokens for: ${email}`);
    
    try {
      const storedData = this.store.get(this.getTokenKey(email));
      
      if (!storedData) {
        logger.debug(`No tokens found for: ${email}`);
        return null;
      }
      
      // Decrypt
      const encryptedBuffer = Buffer.from(storedData.encrypted, 'base64');
      const decrypted = safeStorage.decryptString(encryptedBuffer);
      
      // Parse JSON
      const tokens: TokenData = JSON.parse(decrypted);
      
      logger.debug(`Tokens retrieved for: ${email}`);
      return tokens;
    } catch (error) {
      logger.error(`Failed to retrieve tokens for ${email}:`, error);
      return null;
    }
  }
  
  /**
   * Update access token (after refresh)
   * 
   * @param email Account email
   * @param newAccessToken New access token
   * @param expiresAt New expiry timestamp
   */
  async updateAccessToken(email: string, newAccessToken: string, expiresAt: number): Promise<void> {
    logger.info(`Updating access token for: ${email}`);
    
    // Get existing tokens
    const tokens = await this.getTokens(email);
    
    if (!tokens) {
      throw new Error(`No tokens found for account: ${email}`);
    }
    
    // Update access token and expiry
    tokens.accessToken = newAccessToken;
    tokens.expiresAt = expiresAt;
    
    // Store updated tokens
    await this.storeTokens(email, tokens);
  }
  
  /**
   * Delete tokens for an account
   * SRS FR-3.1.4: Delete all associated data when removing account
   * 
   * @param email Account email address
   * @returns True if deleted, false if not found
   */
  async deleteTokens(email: string): Promise<boolean> {
    logger.info(`Deleting tokens for: ${email}`);
    
    const key = this.getTokenKey(email);
    const exists = this.store.has(key);
    
    if (exists) {
      this.store.delete(key);
      logger.info(`Tokens deleted for: ${email}`);
      return true;
    }
    
    logger.warn(`No tokens to delete for: ${email}`);
    return false;
  }
  
  /**
   * Check if tokens exist for an account
   * 
   * @param email Account email
   * @returns True if tokens exist
   */
  hasTokens(email: string): boolean {
    return this.store.has(this.getTokenKey(email));
  }
  
  /**
   * Check if access token is expired or about to expire
   * 
   * @param tokens Token data
   * @param bufferMinutes Consider expired if expiring within this many minutes
   * @returns True if expired or about to expire
   */
  isTokenExpired(tokens: TokenData, bufferMinutes: number = 5): boolean {
    const bufferMs = bufferMinutes * 60 * 1000;
    const now = Date.now();
    const expiresAt = tokens.expiresAt * 1000; // Convert to ms
    
    return now >= (expiresAt - bufferMs);
  }
  
  /**
   * Get all stored account emails
   * 
   * @returns Array of email addresses that have stored tokens
   */
  getAllAccountEmails(): string[] {
    const allData = this.store.store;
    return Object.values(allData).map(data => data.email);
  }
  
  /**
   * Clear all tokens (use with caution!)
   */
  clearAll(): void {
    logger.warn('Clearing all stored tokens');
    this.store.clear();
  }
  
  /**
   * Generate storage key for account tokens
   */
  private getTokenKey(email: string): string {
    return `tokens.${email}`;
  }
}

