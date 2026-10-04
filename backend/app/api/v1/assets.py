"""
backend/app/api/v1/assets.py
API endpoints for Asset registry and multi-market configurations.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.asset import AssetCreate, AssetResponse
from backend.app.crud.crud_asset import crud_asset

router = APIRouter(prefix="/assets", tags=["Assets & Instruments"])


@router.get("", response_model=List[AssetResponse])
def list_assets(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """
    List all supported trading assets (Crypto, Forex, Commodities, Indices, Stocks).
    """
    return crud_asset.get_multi(db=db, skip=skip, limit=limit, active_only=active_only)


@router.get("/{symbol}", response_model=AssetResponse)
def get_asset_by_symbol(symbol: str, db: Session = Depends(get_db)):
    """
    Get detailed specifications for a specific trading symbol (e.g. BTC/USDT).
    """
    # Replace URL-encoded slash or dash if needed
    cleaned_symbol = symbol.replace("-", "/").upper()
    asset = crud_asset.get_by_symbol(db=db, symbol=cleaned_symbol)
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset symbol '{cleaned_symbol}' not found in registry",
        )
    return asset


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(asset_in: AssetCreate, db: Session = Depends(get_db)):
    """
    Register a new tradeable asset into the database.
    """
    existing = crud_asset.get_by_symbol(db=db, symbol=asset_in.symbol)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset '{asset_in.symbol}' is already registered",
        )
    return crud_asset.create(db=db, obj_in=asset_in)
