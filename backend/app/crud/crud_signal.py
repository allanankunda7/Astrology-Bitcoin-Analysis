"""
backend/app/crud/crud_signal.py
Repository CRUD operations for Probabilistic Trading Signals.
"""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.signal import TradingSignal
from backend.app.schemas.signal import SignalCreate, SignalUpdate


class CRUDSignal:
    def get(self, db: Session, signal_id: int) -> Optional[TradingSignal]:
        return db.query(TradingSignal).filter(TradingSignal.id == signal_id).first()

    def get_active(
        self, db: Session, asset_id: Optional[int] = None, limit: int = 50
    ) -> List[TradingSignal]:
        query = db.query(TradingSignal).filter(TradingSignal.status == "ACTIVE")
        if asset_id:
            query = query.filter(TradingSignal.asset_id == asset_id)
        return query.order_by(TradingSignal.generated_at.desc()).limit(limit).all()

    def create(self, db: Session, obj_in: SignalCreate) -> TradingSignal:
        db_obj = TradingSignal(
            asset_id=obj_in.asset_id,
            strategy_id=obj_in.strategy_id,
            timeframe=obj_in.timeframe,
            direction=obj_in.direction,
            technical_score=obj_in.technical_score,
            confidence=obj_in.confidence,
            market_regime=obj_in.market_regime,
            entry_zone_low=obj_in.entry_zone_low,
            entry_zone_high=obj_in.entry_zone_high,
            entry_price_est=obj_in.entry_price_est,
            stop_loss=obj_in.stop_loss,
            invalidation_price=obj_in.invalidation_price,
            invalidation_reason=obj_in.invalidation_reason,
            target_1=obj_in.target_1,
            target_2=obj_in.target_2,
            target_3=obj_in.target_3,
            risk_reward_ratio=obj_in.risk_reward_ratio,
            supporting_factors=obj_in.supporting_factors,
            conflicting_factors=obj_in.conflicting_factors,
            status=obj_in.status,
            expires_at=obj_in.expires_at,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def invalidate(self, db: Session, signal_id: int, reason: str) -> Optional[TradingSignal]:
        db_obj = self.get(db, signal_id)
        if not db_obj:
            return None
        db_obj.status = "INVALIDATED"
        db_obj.invalidated_at = datetime.utcnow()
        db_obj.invalidation_reason = reason
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_signal = CRUDSignal()
