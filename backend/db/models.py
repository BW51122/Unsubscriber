"""
Database models
"""

from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from db.database import Base


class Account(Base):
    """
    Gmail account model
    
    Note: OAuth tokens are NOT stored here - they're stored in
    Electron's secure credential manager. This only stores account metadata.
    """
    __tablename__ = "accounts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Timestamps
    added_timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.now)
    last_sync_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    
    # Settings
    is_realtime_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Status tracking
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    # Possible statuses: 'active', 'error', 'revoked', 'disabled'
    
    pending_subscriptions_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    def __repr__(self) -> str:
        return f"<Account(email='{self.email}', status='{self.status}')>"

