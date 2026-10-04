"""
backend/app/crud/crud_trade_journal.py
Repository CRUD operations for Trade Journal, Paper Trading, and Execution Analytics.
"""
from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.trade_journal import TradeJournalEntry
from backend.app.schemas.trade_journal import (
    TradeJournalCreate, TradeJournalUpdate, JournalAnalytics
)


class CRUDTradeJournal:
    def get(self, db: Session, entry_id: int) -> Optional[TradeJournalEntry]:
        return db.query(TradeJournalEntry).filter(TradeJournalEntry.id == entry_id).first()

    def get_by_user(
        self, db: Session, user_id: int, status: Optional[str] = None, limit: int = 100
    ) -> List[TradeJournalEntry]:
        query = db.query(TradeJournalEntry).filter(TradeJournalEntry.user_id == user_id)
        if status:
            query = query.filter(TradeJournalEntry.status == status)
        return query.order_by(TradeJournalEntry.opened_at.desc()).limit(limit).all()

    def create(self, db: Session, obj_in: TradeJournalCreate) -> TradeJournalEntry:
        db_obj = TradeJournalEntry(
            user_id=obj_in.user_id,
            asset_id=obj_in.asset_id,
            signal_id=obj_in.signal_id,
            trade_type=obj_in.trade_type,
            execution_mode=obj_in.execution_mode,
            status=obj_in.status,
            entry_price=obj_in.entry_price,
            stop_loss=obj_in.stop_loss,
            take_profit=obj_in.take_profit,
            position_size_usd=obj_in.position_size_usd,
            quantity=obj_in.quantity,
            initial_risk_usd=obj_in.initial_risk_usd,
            setup_grade=obj_in.setup_grade,
            emotional_state=obj_in.emotional_state,
            notes=obj_in.notes,
            opened_at=obj_in.opened_at or datetime.utcnow(),
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def close_trade(
        self, db: Session, entry_id: int, exit_price: Decimal, exit_reason: str
    ) -> Optional[TradeJournalEntry]:
        """
        Closes an open position and calculates exact realized PnL, percentage return, and R-multiple.
        """
        trade = self.get(db, entry_id)
        if not trade or trade.status == "CLOSED":
            return trade

        trade.exit_price = exit_price
        trade.exit_reason = exit_reason
        trade.status = "CLOSED"
        trade.closed_at = datetime.utcnow()

        # Quantitative return calculations
        # For Long: (exit - entry) * quantity
        # For Short: (entry - exit) * quantity
        if trade.trade_type == "LONG":
            trade.realized_pnl_usd = (exit_price - trade.entry_price) * trade.quantity
            trade.return_percentage = ((exit_price - trade.entry_price) / trade.entry_price) * Decimal("100")
        else:
            trade.realized_pnl_usd = (trade.entry_price - exit_price) * trade.quantity
            trade.return_percentage = ((trade.entry_price - exit_price) / trade.entry_price) * Decimal("100")

        # R-Multiple calculation: Realized PnL / Initial Risk
        if trade.initial_risk_usd and trade.initial_risk_usd > Decimal("0"):
            trade.r_multiple = trade.realized_pnl_usd / trade.initial_risk_usd
        else:
            trade.r_multiple = Decimal("0.0")

        db.commit()
        db.refresh(trade)
        return trade

    def get_user_analytics(self, db: Session, user_id: int) -> JournalAnalytics:
        """
        Calculates quantitative trading journal metrics:
        - Win rate (%)
        - Total realized PnL ($)
        - Average R-multiple
        - Profit factor
        """
        trades = db.query(TradeJournalEntry).filter(
            TradeJournalEntry.user_id == user_id
        ).all()

        total_trades = len(trades)
        closed_trades = [t for t in trades if t.status == "CLOSED"]
        open_trades = [t for t in trades if t.status == "OPEN"]

        if not closed_trades:
            return JournalAnalytics(
                total_trades=total_trades,
                open_trades=len(open_trades),
                closed_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate_pct=0.0,
                total_realized_pnl=Decimal("0.00"),
                average_r_multiple=0.0,
                profit_factor=0.0,
                largest_winner=Decimal("0.00"),
                largest_loser=Decimal("0.00"),
            )

        winners = [t for t in closed_trades if (t.realized_pnl_usd or 0) > 0]
        losers = [t for t in closed_trades if (t.realized_pnl_usd or 0) < 0]

        win_rate = (len(winners) / len(closed_trades)) * 100.0 if closed_trades else 0.0

        total_pnl = sum([t.realized_pnl_usd for t in closed_trades if t.realized_pnl_usd is not None], Decimal("0.00"))
        gross_profit = sum([t.realized_pnl_usd for t in winners if t.realized_pnl_usd is not None], Decimal("0.00"))
        gross_loss = abs(sum([t.realized_pnl_usd for t in losers if t.realized_pnl_usd is not None], Decimal("0.00")))

        profit_factor = float(gross_profit / gross_loss) if gross_loss > 0 else (99.9 if gross_profit > 0 else 0.0)

        r_multiples = [float(t.r_multiple) for t in closed_trades if t.r_multiple is not None]
        avg_r = (sum(r_multiples) / len(r_multiples)) if r_multiples else 0.0

        largest_winner = max([t.realized_pnl_usd for t in winners], default=Decimal("0.00"))
        largest_loser = min([t.realized_pnl_usd for t in losers], default=Decimal("0.00"))

        return JournalAnalytics(
            total_trades=total_trades,
            open_trades=len(open_trades),
            closed_trades=len(closed_trades),
            winning_trades=len(winners),
            losing_trades=len(losers),
            win_rate_pct=round(win_rate, 2),
            total_realized_pnl=round(total_pnl, 2),
            average_r_multiple=round(avg_r, 2),
            profit_factor=round(profit_factor, 2),
            largest_winner=round(largest_winner, 2),
            largest_loser=round(largest_loser, 2),
        )


crud_trade_journal = CRUDTradeJournal()
