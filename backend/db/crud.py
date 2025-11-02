"""
CRUD operations for database models
"""

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from db.models import Account
from utils.logger import logger


class AccountCRUD:
    """CRUD operations for Account model"""
    
    @staticmethod
    async def create(db: AsyncSession, email: str, display_name: str | None = None) -> Account:
        """
        Create new account
        
        Args:
            db: Database session
            email: Account email address
            display_name: User's display name
            
        Returns:
            Created account
        """
        account = Account(
            email=email,
            display_name=display_name,
            added_timestamp=datetime.now(),
            is_realtime_enabled=False,
            status="active",
            pending_subscriptions_count=0,
        )
        
        db.add(account)
        await db.flush()
        await db.refresh(account)
        
        logger.info(f"Created account: {email}")
        return account
    
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Account | None:
        """
        Get account by email
        
        Args:
            db: Database session
            email: Account email
            
        Returns:
            Account if found, None otherwise
        """
        result = await db.execute(select(Account).where(Account.email == email))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_id(db: AsyncSession, account_id: int) -> Account | None:
        """
        Get account by ID
        
        Args:
            db: Database session
            account_id: Account ID
            
        Returns:
            Account if found, None otherwise
        """
        result = await db.execute(select(Account).where(Account.id == account_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> list[Account]:
        """
        Get all accounts
        
        Args:
            db: Database session
            
        Returns:
            List of all accounts
        """
        result = await db.execute(select(Account).order_by(Account.added_timestamp.desc()))
        return list(result.scalars().all())
    
    @staticmethod
    async def update_status(db: AsyncSession, email: str, status: str) -> Account | None:
        """
        Update account status
        
        Args:
            db: Database session
            email: Account email
            status: New status ('active', 'error', 'revoked', 'disabled')
            
        Returns:
            Updated account or None if not found
        """
        account = await AccountCRUD.get_by_email(db, email)
        if account:
            account.status = status
            await db.flush()
            await db.refresh(account)
            logger.info(f"Updated account {email} status to: {status}")
        return account
    
    @staticmethod
    async def update_last_sync(db: AsyncSession, email: str) -> Account | None:
        """
        Update last sync timestamp
        
        Args:
            db: Database session
            email: Account email
            
        Returns:
            Updated account or None if not found
        """
        account = await AccountCRUD.get_by_email(db, email)
        if account:
            account.last_sync_timestamp = datetime.now()
            await db.flush()
            await db.refresh(account)
            logger.debug(f"Updated last sync for: {email}")
        return account
    
    @staticmethod
    async def set_realtime_enabled(db: AsyncSession, email: str, enabled: bool) -> Account | None:
        """
        Enable/disable real-time monitoring
        
        Args:
            db: Database session
            email: Account email
            enabled: True to enable, False to disable
            
        Returns:
            Updated account or None if not found
        """
        account = await AccountCRUD.get_by_email(db, email)
        if account:
            account.is_realtime_enabled = enabled
            
            # SRS FR-5.1.2: Disabling clears pending subscriptions
            if not enabled:
                account.pending_subscriptions_count = 0
            
            await db.flush()
            await db.refresh(account)
            logger.info(f"Set realtime_enabled={enabled} for: {email}")
        return account
    
    @staticmethod
    async def update_pending_count(db: AsyncSession, email: str, count: int) -> Account | None:
        """
        Update pending subscriptions count
        
        Args:
            db: Database session
            email: Account email
            count: New count
            
        Returns:
            Updated account or None if not found
        """
        account = await AccountCRUD.get_by_email(db, email)
        if account:
            account.pending_subscriptions_count = count
            await db.flush()
            await db.refresh(account)
        return account
    
    @staticmethod
    async def delete(db: AsyncSession, email: str) -> bool:
        """
        Delete account
        
        Args:
            db: Database session
            email: Account email
            
        Returns:
            True if deleted, False if not found
        """
        result = await db.execute(delete(Account).where(Account.email == email))
        deleted = result.rowcount > 0
        
        if deleted:
            logger.info(f"Deleted account: {email}")
        else:
            logger.warn(f"Account not found for deletion: {email}")
        
        return deleted
    
    @staticmethod
    async def exists(db: AsyncSession, email: str) -> bool:
        """
        Check if account exists
        
        Args:
            db: Database session
            email: Account email
            
        Returns:
            True if exists, False otherwise
        """
        account = await AccountCRUD.get_by_email(db, email)
        return account is not None

