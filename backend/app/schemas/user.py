"""
backend/app/schemas/user.py
Pydantic Schemas for User authentication and risk management profile.
"""
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    account_currency: str = "USD"
    default_balance: Decimal = Decimal("100000.00")
    max_risk_per_trade_pct: Decimal = Decimal("1.00")
    max_open_positions: int = 5
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    default_balance: Optional[Decimal] = None
    max_risk_per_trade_pct: Optional[Decimal] = None
    max_open_positions: Optional[int] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
