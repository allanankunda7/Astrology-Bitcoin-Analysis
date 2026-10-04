"""
backend/app/schemas/asset.py
Pydantic Schemas for Multi-Asset Specifications.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class AssetBase(BaseModel):
    symbol: str = Field(..., example="BTC/USDT")
    name: str = Field(..., example="Bitcoin / Tether")
    asset_class: str = Field(..., example="crypto") # "crypto", "forex", "commodity", "index", "stock"
    base_currency: str = Field(..., example="BTC")
    quote_currency: str = Field(..., example="USDT")
    price_precision: int = 2
    quantity_precision: int = 6
    tick_size: Decimal = Decimal("0.01")
    min_order_size: Decimal = Decimal("0.0001")
    is_active: bool = True
    metadata_info: Optional[Dict[str, Any]] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    price_precision: Optional[int] = None
    quantity_precision: Optional[int] = None
    tick_size: Optional[Decimal] = None
    min_order_size: Optional[Decimal] = None
    is_active: Optional[bool] = None
    metadata_info: Optional[Dict[str, Any]] = None


class AssetResponse(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
