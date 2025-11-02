"""
Google OAuth 2.0 Service
Handles OAuth flow, token exchange, and token refresh
"""

import secrets
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode
import httpx
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from config import settings
from utils.logger import logger
from models.account import TokenData


class OAuthService:
    """Google OAuth 2.0 service"""
    
    def __init__(self):
        # Validate configuration
        if not settings.google_client_id or not settings.google_client_secret:
            logger.error("Google OAuth credentials not configured!")
            logger.error(f"Client ID: {'SET' if settings.google_client_id else 'MISSING'}")
            logger.error(f"Client Secret: {'SET' if settings.google_client_secret else 'MISSING'}")
            raise ValueError("Google OAuth credentials not configured. Please check backend/.env file")
        
        logger.info(f"OAuth service initialized with client_id: {settings.google_client_id[:20]}...")
        
        self.active_states: dict[str, asyncio.Future] = {}
        self.client_config = {
            "installed": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [settings.google_oauth_redirect_uri],
            }
        }
    
    def generate_authorization_url(self) -> tuple[str, str]:
        """
        Generate OAuth authorization URL
        
        Returns:
            Tuple of (auth_url, state)
            state is used for CSRF protection
        """
        # Generate random state for CSRF protection
        state = secrets.token_urlsafe(32)
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            self.client_config,
            scopes=settings.gmail_scopes,
            redirect_uri=settings.google_oauth_redirect_uri,
        )
        
        # Generate authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',  # Request refresh token
            include_granted_scopes='true',
            prompt='consent',  # Always show consent screen to ensure refresh token
            state=state,
        )
        
        logger.info(f"Generated OAuth URL with state: {state[:10]}...")
        
        return auth_url, state
    
    async def exchange_code_for_tokens(self, code: str, state: str) -> TokenData:
        """
        Exchange authorization code for access and refresh tokens
        
        Args:
            code: Authorization code from OAuth callback
            state: State parameter for verification
            
        Returns:
            TokenData with tokens
            
        Raises:
            ValueError: If code exchange fails
        """
        logger.info("Exchanging authorization code for tokens")
        
        try:
            # Manual token exchange to avoid strict scope validation
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "redirect_uri": settings.google_oauth_redirect_uri,
                        "grant_type": "authorization_code",
                    },
                    timeout=10.0,
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Calculate expiry timestamp
                expires_in = data.get('expires_in', 3600)
                expires_at = int((datetime.now() + timedelta(seconds=expires_in)).timestamp())
                
                token_data = TokenData(
                    access_token=data['access_token'],
                    refresh_token=data.get('refresh_token', ''),
                    expires_at=expires_at,
                    scope=data.get('scope', ''),
                    token_type=data.get('token_type', 'Bearer'),
                )
                
                logger.info("Successfully exchanged code for tokens")
                logger.info(f"Granted scopes: {token_data.scope}")
                
                return token_data
            
        except Exception as e:
            logger.error(f"Failed to exchange code for tokens: {e}", exc_info=True)
            raise ValueError(f"Token exchange failed: {str(e)}")
    
    async def refresh_access_token(self, refresh_token: str) -> TokenData:
        """
        Refresh expired access token using refresh token
        
        Args:
            refresh_token: The refresh token
            
        Returns:
            New TokenData with updated access token
            
        Raises:
            ValueError: If refresh fails
        """
        logger.info("Refreshing access token")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": settings.google_client_id,
                        "client_secret": settings.google_client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                    },
                    timeout=10.0,
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Calculate new expiry
                expires_at = int((datetime.now() + timedelta(seconds=data.get('expires_in', 3600))).timestamp())
                
                token_data = TokenData(
                    access_token=data['access_token'],
                    refresh_token=refresh_token,  # Refresh token stays the same
                    expires_at=expires_at,
                    scope=data.get('scope', ''),
                    token_type=data.get('token_type', 'Bearer'),
                )
                
                logger.info("Successfully refreshed access token")
                return token_data
                
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}", exc_info=True)
            raise ValueError(f"Token refresh failed: {str(e)}")
    
    async def get_user_email(self, access_token: str) -> str:
        """
        Get user's email address using access token
        
        Args:
            access_token: Valid access token
            
        Returns:
            User's email address
            
        Raises:
            ValueError: If request fails
        """
        logger.info("Fetching user email from Gmail API")
        
        try:
            # Create credentials
            credentials = Credentials(token=access_token)
            
            # Build Gmail service
            service = build('gmail', 'v1', credentials=credentials)
            
            # Get user profile
            profile = service.users().getProfile(userId='me').execute()
            
            email = profile['emailAddress']
            logger.info(f"Retrieved user email: {email}")
            
            return email
            
        except Exception as e:
            logger.error(f"Failed to get user email: {e}", exc_info=True)
            raise ValueError(f"Failed to retrieve user email: {str(e)}")
    
    def is_token_expired(self, expires_at: int, buffer_minutes: int = 5) -> bool:
        """
        Check if access token is expired or about to expire
        
        Args:
            expires_at: Unix timestamp when token expires
            buffer_minutes: Consider expired if expiring within this many minutes
            
        Returns:
            True if expired or about to expire
        """
        buffer_seconds = buffer_minutes * 60
        current_time = datetime.now().timestamp()
        
        return current_time >= (expires_at - buffer_seconds)
    
    async def validate_tokens(self, access_token: str) -> bool:
        """
        Validate that access token is still valid
        
        Args:
            access_token: Access token to validate
            
        Returns:
            True if valid, False otherwise
        """
        try:
            # Try to get user email - if it works, token is valid
            await self.get_user_email(access_token)
            return True
        except Exception:
            return False


# Global instance
oauth_service = OAuthService()

