"""
Pydantic models for account operations
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime


class OAuthStartResponse(BaseModel):
    """Response when starting OAuth flow"""
    auth_url: str
    state: str  # Random state for CSRF protection


class OAuthCallbackRequest(BaseModel):
    """OAuth callback data"""
    code: str
    state: str


class TokenData(BaseModel):
    """OAuth token data"""
    access_token: str
    refresh_token: str
    expires_at: int  # Unix timestamp
    scope: str
    token_type: str = "Bearer"


class AccountCreate(BaseModel):
    """Data for creating new account"""
    email: EmailStr
    display_name: str | None = None
    tokens: TokenData


class AccountResponse(BaseModel):
    """Account data returned to frontend"""
    id: int
    email: str
    display_name: str | None
    added_timestamp: datetime
    last_sync_timestamp: datetime | None
    is_realtime_enabled: bool
    status: str
    pending_subscriptions_count: int
    
    model_config = {
        "from_attributes": True,
    }


class AccountListResponse(BaseModel):
    """List of accounts"""
    accounts: list[AccountResponse]
    total: int


class AccountDeleteResponse(BaseModel):
    """Response when account is deleted"""
    success: bool
    email: str
    message: str

