"""
backend/app/models/user.py
SQLAlchemy Model for Users, Risk Preferences, and Account Settings.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric
from sqlalchemy.orm import relationship
from backend.app.db.base import Base


class User(Base):
    """
    Represents an authenticated trader/analyst in the platform.
    Stores risk profile constraints (e.g. maximum portfolio risk percentage, account balance).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    
    # Financial & Risk Parameters
    account_currency = Column(String(10), default="USD", nullable=False)
    default_balance = Column(Numeric(precision=18, scale=2), default=100000.00, nullable=False)
    max_risk_per_trade_pct = Column(Numeric(precision=5, scale=2), default=1.00, nullable=False)  # e.g., 1.0%
    max_open_positions = Column(Integer, default=5, nullable=False)
    
    # Account status & permissions
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    trades = relationship("TradeJournalEntry", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email='{self.email}' balance={self.default_balance}>"
