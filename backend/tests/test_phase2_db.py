"""
backend/tests/test_phase2_db.py
Comprehensive Test Suite for Phase 2: PostgreSQL / SQLAlchemy Schemas.
Tests all 6 tables, relationships, constraints, CRUD operations, and financial math.
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.base import Base
from backend.app.models.user import User
from backend.app.models.asset import Asset
from backend.app.models.market_data import MarketCandle
from backend.app.models.strategy import Strategy
from backend.app.models.signal import TradingSignal
from backend.app.models.trade_journal import TradeJournalEntry
from backend.app.crud.crud_asset import crud_asset
from backend.app.crud.crud_strategy import crud_strategy
from backend.app.crud.crud_signal import crud_signal
from backend.app.crud.crud_trade_journal import crud_trade_journal
from backend.app.schemas.asset import AssetCreate
from backend.app.schemas.strategy import StrategyCreate
from backend.app.schemas.signal import SignalCreate
from backend.app.schemas.trade_journal import TradeJournalCreate


@pytest.fixture(scope="function")
def db_session():
    """
    Creates an isolated in-memory SQLite database for deterministic testing of models and relationships.
    """
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_schema_registration():
    """Verifies that all 6 required tables are registered in SQLAlchemy Base.metadata."""
    table_names = set(Base.metadata.tables.keys())
    expected_tables = {
        "users",
        "assets",
        "market_candles",
        "strategies",
        "trading_signals",
        "trade_journal",
    }
    assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"


def test_user_creation(db_session):
    """Verifies user risk preferences, default balance, and account constraints."""
    user = User(
        email="trader@quantresearch.io",
        hashed_password="secure_hashed_password_hash",
        full_name="Alpha Researcher",
        account_currency="USD",
        default_balance=Decimal("150000.00"),
        max_risk_per_trade_pct=Decimal("1.50"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.email == "trader@quantresearch.io"
    assert user.default_balance == Decimal("150000.00")
    assert user.is_active is True


def test_asset_crud(db_session):
    """Verifies multi-asset registry operations for Crypto, Forex, and Commodities."""
    asset_in = AssetCreate(
        symbol="BTC/USDT",
        name="Bitcoin / Tether",
        asset_class="crypto",
        base_currency="BTC",
        quote_currency="USDT",
        price_precision=2,
        quantity_precision=6,
        tick_size=Decimal("0.01"),
        min_order_size=Decimal("0.0001"),
        is_active=True,
    )
    asset = crud_asset.create(db_session, asset_in)
    assert asset.id is not None
    assert asset.symbol == "BTC/USDT"

    fetched = crud_asset.get_by_symbol(db_session, "BTC/USDT")
    assert fetched is not None
    assert fetched.asset_class == "crypto"


def test_market_candle_creation_and_precision(db_session):
    """Verifies OHLCV time-series insertion with high-precision decimals."""
    asset = Asset(
        symbol="ETH/USDT",
        name="Ethereum",
        asset_class="crypto",
        base_currency="ETH",
        quote_currency="USDT",
    )
    db_session.add(asset)
    db_session.commit()

    now = datetime.utcnow()
    candle = MarketCandle(
        asset_id=asset.id,
        timeframe="4h",
        timestamp=now,
        open=Decimal("3450.25"),
        high=Decimal("3510.80"),
        low=Decimal("3420.00"),
        close=Decimal("3495.50"),
        volume=Decimal("12850.45000000"),
        vwap=Decimal("3472.10"),
    )
    db_session.add(candle)
    db_session.commit()

    assert candle.id is not None
    assert candle.close == Decimal("3495.50")
    assert candle.asset.symbol == "ETH/USDT"


def test_strategy_and_signal_lifecycle(db_session):
    """Verifies strategy registration, signal generation with transparent scoring, and invalidation."""
    asset = Asset(
        symbol="BTC/USDT",
        name="Bitcoin",
        asset_class="crypto",
        base_currency="BTC",
        quote_currency="USDT",
    )
    db_session.add(asset)
    db_session.commit()

    strategy_in = StrategyCreate(
        name="Trend Following Alpha",
        code="TF_EMA_MACD_ADX",
        category="trend",
        description="EMA stack trend alignment with ADX strength filter",
        parameters={"fast_ema": 21, "slow_ema": 50, "trend_ema": 200, "adx_threshold": 25},
        default_timeframe="4h",
    )
    strategy = crud_strategy.create(db_session, strategy_in)
    assert strategy.id is not None

    signal_in = SignalCreate(
        asset_id=asset.id,
        strategy_id=strategy.id,
        timeframe="4h",
        direction="LONG",
        technical_score=8,
        confidence=Decimal("0.8250"),
        market_regime="Strong Uptrend",
        entry_zone_low=Decimal("64200.00"),
        entry_zone_high=Decimal("64500.00"),
        entry_price_est=Decimal("64350.00"),
        stop_loss=Decimal("63100.00"),
        invalidation_price=Decimal("62900.00"),
        invalidation_reason="4H close below swing low pivot at $62,900",
        target_1=Decimal("66850.00"),
        target_2=Decimal("68100.00"),
        risk_reward_ratio=Decimal("2.80"),
        supporting_factors=["Price above 200 EMA", "ADX at 28.5 (strong trend)", "Bullish BOS confirmed"],
        conflicting_factors=["RSI approaching 68"],
    )
    signal = crud_signal.create(db_session, signal_in)
    assert signal.id is not None
    assert signal.technical_score == 8
    assert signal.status == "ACTIVE"
    assert len(signal.supporting_factors) == 3

    # Test invalidation
    invalidated = crud_signal.invalidate(db_session, signal.id, "Swing low violated")
    assert invalidated.status == "INVALIDATED"
    assert invalidated.invalidated_at is not None


def test_trade_journal_execution_and_analytics(db_session):
    """
    Verifies trade logging, position closing, accurate R-multiple calculation,
    and portfolio performance analytics.
    """
    user = User(
        email="analyst@quant.com",
        hashed_password="pw",
        default_balance=Decimal("100000.00"),
    )
    asset = Asset(
        symbol="BTC/USDT",
        name="Bitcoin",
        asset_class="crypto",
        base_currency="BTC",
        quote_currency="USDT",
    )
    db_session.add_all([user, asset])
    db_session.commit()

    # Create Trade 1: Winning trade (+2.0R)
    # Entry: 60,000, SL: 59,000 (Risk: $1,000 per BTC). Size: 1.0 BTC ($60,000 USD). Risk: $1,000.
    trade_1 = crud_trade_journal.create(
        db_session,
        TradeJournalCreate(
            user_id=user.id,
            asset_id=asset.id,
            trade_type="LONG",
            execution_mode="PAPER",
            entry_price=Decimal("60000.00"),
            stop_loss=Decimal("59000.00"),
            take_profit=Decimal("62000.00"),
            position_size_usd=Decimal("60000.00"),
            quantity=Decimal("1.0"),
            initial_risk_usd=Decimal("1000.00"),
            setup_grade="A",
            notes="Clean 4H pullback to 21 EMA",
        ),
    )
    # Close at target $62,000 -> PnL: +$2,000.00, R-multiple: 2.0R
    crud_trade_journal.close_trade(
        db_session,
        entry_id=trade_1.id,
        exit_price=Decimal("62000.00"),
        exit_reason="Target 1 Hit",
    )

    # Create Trade 2: Losing trade (-1.0R)
    # Entry: 62,500, SL: 61,500. Quantity: 1.0 BTC. Initial risk: $1,000.
    trade_2 = crud_trade_journal.create(
        db_session,
        TradeJournalCreate(
            user_id=user.id,
            asset_id=asset.id,
            trade_type="LONG",
            execution_mode="PAPER",
            entry_price=Decimal("62500.00"),
            stop_loss=Decimal("61500.00"),
            take_profit=Decimal("64500.00"),
            position_size_usd=Decimal("62500.00"),
            quantity=Decimal("1.0"),
            initial_risk_usd=Decimal("1000.00"),
            setup_grade="B",
            notes="Breakout retest attempt",
        ),
    )
    # Close at stop loss $61,500 -> PnL: -$1,000.00, R-multiple: -1.0R
    crud_trade_journal.close_trade(
        db_session,
        entry_id=trade_2.id,
        exit_price=Decimal("61500.00"),
        exit_reason="Stop Loss Hit",
    )

    # Compute quantitative analytics
    analytics = crud_trade_journal.get_user_analytics(db_session, user.id)

    assert analytics.total_trades == 2
    assert analytics.closed_trades == 2
    assert analytics.winning_trades == 1
    assert analytics.losing_trades == 1
    assert analytics.win_rate_pct == 50.0
    assert analytics.total_realized_pnl == Decimal("1000.00") # $2000 - $1000 = $1000
    assert analytics.profit_factor == 2.0 # Gross profit $2000 / Gross loss $1000 = 2.0
    assert analytics.average_r_multiple == 0.5 # (2.0 - 1.0) / 2 = 0.5R
