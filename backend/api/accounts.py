"""
Account Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from db.database import get_db
from db.crud import AccountCRUD
from models.account import (
    OAuthStartResponse,
    OAuthCallbackRequest,
    AccountCreate,
    AccountResponse,
    AccountListResponse,
    AccountDeleteResponse,
    TokenData,
)
from services.oauth_service import oauth_service
from services.callback_server import callback_server
from utils.logger import logger
from config import settings


router = APIRouter()


# Store active OAuth states for validation
active_oauth_flows: dict[str, dict] = {}


@router.post("/authorize/start", response_model=OAuthStartResponse)
async def start_oauth_flow():
    """
    Start OAuth 2.0 authorization flow
    
    Returns:
        Authorization URL and state token
    """
    logger.info("Starting OAuth authorization flow")
    
    try:
        # Start callback server
        callback_server.start()
        
        # Generate authorization URL
        auth_url, state = oauth_service.generate_authorization_url()
        
        # Store state for later validation
        active_oauth_flows[state] = {
            "started_at": datetime.now().timestamp(),
            "completed": False,
        }
        
        return OAuthStartResponse(
            auth_url=auth_url,
            state=state,
        )
        
    except Exception as e:
        logger.error(f"Failed to start OAuth flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start OAuth: {str(e)}")


@router.post("/authorize/complete")
async def complete_oauth_flow(
    state: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Complete OAuth flow - wait for callback and exchange code
    
    Args:
        state: State token from start_oauth_flow
        
    Returns:
        Account information and tokens
        
    Raises:
        HTTPException: If flow fails or times out
    """
    logger.info(f"Completing OAuth flow for state: {state[:10]}...")
    
    # Validate state
    if state not in active_oauth_flows:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    
    try:
        # Wait for callback (with timeout)
        code, received_state = await callback_server.wait_for_callback(
            expected_state=state,
            timeout_seconds=settings.oauth_timeout_seconds
        )
        
        # Exchange code for tokens
        tokens = await oauth_service.exchange_code_for_tokens(code, state)
        
        # Get user email from Google
        email = await oauth_service.get_user_email(tokens.access_token)
        
        # Check if account already exists (SRS FR-3.1.3)
        existing = await AccountCRUD.exists(db, email)
        if existing:
            # Stop callback server
            background_tasks.add_task(callback_server.stop)
            
            raise HTTPException(
                status_code=409,
                detail=f"This account has already been added: {email}"
            )
        
        # Create account in database
        account = await AccountCRUD.create(db, email=email, display_name=None)
        
        # IMPORTANT: Commit immediately so subsequent requests see the account
        await db.commit()
        await db.refresh(account)
        
        # Mark flow as completed
        active_oauth_flows[state]["completed"] = True
        
        # Schedule callback server stop
        background_tasks.add_task(callback_server.stop)
        
        # Return account and tokens (tokens will be stored by Electron)
        return {
            "account": AccountResponse.model_validate(account),
            "tokens": tokens.model_dump(),
        }
        
    except TimeoutError as e:
        # Stop callback server
        background_tasks.add_task(callback_server.stop)
        raise HTTPException(status_code=408, detail=str(e))
        
    except ValueError as e:
        # Stop callback server
        background_tasks.add_task(callback_server.stop)
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        # Stop callback server
        background_tasks.add_task(callback_server.stop)
        logger.error(f"OAuth flow failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"OAuth flow failed: {str(e)}")


@router.get("/list", response_model=AccountListResponse)
async def list_accounts(db: AsyncSession = Depends(get_db)):
    """
    Get all connected accounts
    
    Returns:
        List of all accounts
    """
    logger.debug("Fetching all accounts")
    
    accounts = await AccountCRUD.get_all(db)
    
    return AccountListResponse(
        accounts=[AccountResponse.model_validate(acc) for acc in accounts],
        total=len(accounts),
    )


@router.get("/{email}", response_model=AccountResponse)
async def get_account(email: str, db: AsyncSession = Depends(get_db)):
    """
    Get account by email
    
    Args:
        email: Account email address
        
    Returns:
        Account data
        
    Raises:
        HTTPException: If account not found
    """
    account = await AccountCRUD.get_by_email(db, email)
    
    if not account:
        raise HTTPException(status_code=404, detail=f"Account not found: {email}")
    
    return AccountResponse.model_validate(account)


@router.delete("/{email}", response_model=AccountDeleteResponse)
async def delete_account(email: str, db: AsyncSession = Depends(get_db)):
    """
    Delete account
    SRS FR-3.1.4: Remove account and all associated data
    
    Args:
        email: Account email address
        
    Returns:
        Deletion confirmation
        
    Raises:
        HTTPException: If account not found
    """
    logger.info(f"Deleting account: {email}")
    
    # Check if exists
    exists = await AccountCRUD.exists(db, email)
    if not exists:
        raise HTTPException(status_code=404, detail=f"Account not found: {email}")
    
    # Delete from database
    deleted = await AccountCRUD.delete(db, email)
    
    if deleted:
        # Note: Electron will also delete tokens from credential manager
        return AccountDeleteResponse(
            success=True,
            email=email,
            message="Account and all associated data deleted successfully",
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to delete account")


@router.post("/{email}/refresh-token", response_model=TokenData)
async def refresh_token(email: str, refresh_token: str):
    """
    Refresh access token
    
    Args:
        email: Account email
        refresh_token: Refresh token
        
    Returns:
        New token data
    """
    logger.info(f"Refreshing token for: {email}")
    
    try:
        new_tokens = await oauth_service.refresh_access_token(refresh_token)
        return new_tokens
        
    except ValueError as e:
        logger.error(f"Token refresh failed for {email}: {e}")
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/{email}/realtime/enable")
async def enable_realtime(email: str, db: AsyncSession = Depends(get_db)):
    """
    Enable real-time monitoring for account
    SRS FR-5.1.1
    
    Args:
        email: Account email
        
    Returns:
        Updated account
    """
    account = await AccountCRUD.set_realtime_enabled(db, email, True)
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return AccountResponse.model_validate(account)


@router.post("/{email}/realtime/disable")
async def disable_realtime(email: str, db: AsyncSession = Depends(get_db)):
    """
    Disable real-time monitoring for account
    SRS FR-5.1.2: Disabling clears pending items
    
    Args:
        email: Account email
        
    Returns:
        Updated account
    """
    account = await AccountCRUD.set_realtime_enabled(db, email, False)
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return AccountResponse.model_validate(account)

