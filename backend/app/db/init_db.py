"""
backend/app/db/init_db.py
Database initialization and seeding script.
Creates tables and seeds default multi-asset registry and quantitative strategies.
"""
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.db.base import Base
from backend.app.db.session import sync_engine, SessionLocal
from backend.app.models.user import User
from backend.app.models.asset import Asset
from backend.app.models.strategy import Strategy
from backend.app.models.signal import TradingSignal
from backend.app.models.trade_journal import TradeJournalEntry


def init_db(db: Session) -> None:
    # 1. Create tables if not exist
    Base.metadata.create_all(bind=sync_engine)

    # 2. Seed default assets
    default_assets = [
        {"symbol": "BTC/USDT", "name": "Bitcoin / Tether", "asset_class": "crypto", "base_currency": "BTC", "quote_currency": "USDT", "price_precision": 2, "quantity_precision": 6, "tick_size": Decimal("0.01"), "min_order_size": Decimal("0.0001")},
        {"symbol": "ETH/USDT", "name": "Ethereum / Tether", "asset_class": "crypto", "base_currency": "ETH", "quote_currency": "USDT", "price_precision": 2, "quantity_precision": 5, "tick_size": Decimal("0.01"), "min_order_size": Decimal("0.001")},
        {"symbol": "SOL/USDT", "name": "Solana / Tether", "asset_class": "crypto", "base_currency": "SOL", "quote_currency": "USDT", "price_precision": 2, "quantity_precision": 4, "tick_size": Decimal("0.01"), "min_order_size": Decimal("0.01")},
        {"symbol": "XAU/USD", "name": "Gold Spot / US Dollar", "asset_class": "commodity", "base_currency": "XAU", "quote_currency": "USD", "price_precision": 2, "quantity_precision": 3, "tick_size": Decimal("0.05"), "min_order_size": Decimal("0.01")},
        {"symbol": "EUR/USD", "name": "Euro / US Dollar", "asset_class": "forex", "base_currency": "EUR", "quote_currency": "USD", "price_precision": 5, "quantity_precision": 2, "tick_size": Decimal("0.00001"), "min_order_size": Decimal("1000")},
        {"symbol": "SPX", "name": "S&P 500 Index", "asset_class": "index", "base_currency": "SPX", "quote_currency": "USD", "price_precision": 2, "quantity_precision": 2, "tick_size": Decimal("0.25"), "min_order_size": Decimal("1")},
    ]

    for asset_data in default_assets:
        existing = db.query(Asset).filter(Asset.symbol == asset_data["symbol"]).first()
        if not existing:
            asset = Asset(**asset_data)
            db.add(asset)

    db.commit()

    # 3. Seed quantitative strategies
    default_strategies = [
        {
            "name": "Trend Following Alpha",
            "code": "TF_EMA_MACD_ADX",
            "category": "trend",
            "description": "Multi-timeframe EMA stack (21 > 50 > 200) filtered by MACD histogram momentum and ADX > 25.",
            "parameters": {"fast_ema": 21, "slow_ema": 50, "trend_ema": 200, "adx_threshold": 25, "rsi_min": 45, "rsi_max": 68},
            "default_timeframe": "4h",
            "required_htf": "1D",
            "backtest_win_rate": "58.4%",
            "backtest_profit_factor": "2.14",
            "sample_size": 342,
        },
        {
            "name": "Breakout & Key Level Retest",
            "code": "BRK_VOL_RETEST",
            "category": "breakout",
            "description": "Structural resistance breakout accompanied by 1.8x relative volume surge and 50% pull-back retest confirmation.",
            "parameters": {"volume_mult": 1.8, "retest_tolerance_pct": 0.35, "consolidation_bars": 12},
            "default_timeframe": "1h",
            "required_htf": "4h",
            "backtest_win_rate": "52.1%",
            "backtest_profit_factor": "2.38",
            "sample_size": 219,
        },
        {
            "name": "Mean Reversion Bollinger Bands",
            "code": "MR_BB_RSI_EXTREME",
            "category": "mean_reversion",
            "description": "2.0-sigma Bollinger Band excursion coinciding with RSI < 30 (or > 70) and pin-bar reversal.",
            "parameters": {"bb_period": 20, "bb_std": 2.0, "rsi_oversold": 28, "rsi_overbought": 72},
            "default_timeframe": "1h",
            "required_htf": "4h",
            "backtest_win_rate": "64.8%",
            "backtest_profit_factor": "1.76",
            "sample_size": 410,
        },
        {
            "name": "Pullback in Trend (Smart Money Structure)",
            "code": "PULLBACK_BOS_OB",
            "category": "pullback",
            "description": "Higher-high market structure with retracement into dynamic support and bullish Change of Character (CHoCH).",
            "parameters": {"htf_trend": "bullish", "fib_retracement_min": 0.50, "fib_retracement_max": 0.618},
            "default_timeframe": "4h",
            "required_htf": "1D",
            "backtest_win_rate": "55.9%",
            "backtest_profit_factor": "2.45",
            "sample_size": 184,
        },
    ]

    for strat_data in default_strategies:
        existing = db.query(Strategy).filter(Strategy.code == strat_data["code"]).first()
        if not existing:
            strat = Strategy(**strat_data)
            db.add(strat)

    db.commit()

    # 4. Seed demo user
    demo_user = db.query(User).filter(User.email == "researcher@trading.io").first()
    if not demo_user:
        demo_user = User(
            email="researcher@trading.io",
            hashed_password="bcrypt_hash_placeholder",
            full_name="Lead Quantitative Analyst",
            account_currency="USD",
            default_balance=Decimal("100000.00"),
            max_risk_per_trade_pct=Decimal("1.00"),
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

    print("[init_db] Database seeded successfully.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
