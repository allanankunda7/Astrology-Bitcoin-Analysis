"""
backend/app/crud/crud_strategy.py
Repository CRUD operations for Quantitative Strategies.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.strategy import Strategy
from backend.app.schemas.strategy import StrategyCreate, StrategyUpdate


class CRUDStrategy:
    def get(self, db: Session, strategy_id: int) -> Optional[Strategy]:
        return db.query(Strategy).filter(Strategy.id == strategy_id).first()

    def get_by_code(self, db: Session, code: str) -> Optional[Strategy]:
        return db.query(Strategy).filter(Strategy.code == code).first()

    def get_multi(
        self, db: Session, skip: int = 0, limit: int = 50, active_only: bool = True
    ) -> List[Strategy]:
        query = db.query(Strategy)
        if active_only:
            query = query.filter(Strategy.is_active == True)
        return query.offset(skip).limit(limit).all()

    def create(self, db: Session, obj_in: StrategyCreate) -> Strategy:
        db_obj = Strategy(
            name=obj_in.name,
            code=obj_in.code,
            category=obj_in.category,
            description=obj_in.description,
            parameters=obj_in.parameters,
            default_timeframe=obj_in.default_timeframe,
            required_htf=obj_in.required_htf,
            is_active=obj_in.is_active,
            author=obj_in.author,
            backtest_win_rate=obj_in.backtest_win_rate,
            backtest_profit_factor=obj_in.backtest_profit_factor,
            sample_size=obj_in.sample_size,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


crud_strategy = CRUDStrategy()
