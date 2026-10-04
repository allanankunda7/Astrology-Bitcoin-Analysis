"""
backend/app/crud/crud_asset.py
Repository CRUD operations for Financial Assets.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.models.asset import Asset
from backend.app.schemas.asset import AssetCreate, AssetUpdate


class CRUDAsset:
    def get(self, db: Session, asset_id: int) -> Optional[Asset]:
        return db.query(Asset).filter(Asset.id == asset_id).first()

    def get_by_symbol(self, db: Session, symbol: str) -> Optional[Asset]:
        return db.query(Asset).filter(Asset.symbol == symbol).first()

    def get_multi(
        self, db: Session, skip: int = 0, limit: int = 100, active_only: bool = True
    ) -> List[Asset]:
        query = db.query(Asset)
        if active_only:
            query = query.filter(Asset.is_active == True)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: AssetCreate) -> Asset:
        db_obj = Asset(
            symbol=obj_in.symbol,
            name=obj_in.name,
            asset_class=obj_in.asset_class,
            base_currency=obj_in.base_currency,
            quote_currency=obj_in.quote_currency,
            price_precision=obj_in.price_precision,
            quantity_precision=obj_in.quantity_precision,
            tick_size=obj_in.tick_size,
            min_order_size=obj_in.min_order_size,
            is_active=obj_in.is_active,
            metadata_info=obj_in.metadata_info,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_asset = CRUDAsset()
