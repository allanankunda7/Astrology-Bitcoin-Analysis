"""
FastAPI Application Entry Point - Phase 2 Setup
==============================================
Provides high-performance async REST API with:
- CORS middleware
- Health check & database verification
- Phase 2 Relational Database Routes:
  * /api/v1/assets - Multi-asset registry
  * /api/v1/signals - Probabilistic algorithmic trade setups
  * /api/v1/journal - Paper trading execution, journal logs & analytics
  * /api/v1/schema - Introspected PostgreSQL / SQLAlchemy schema metadata
  * /api/v1/indicators - Technical indicator computations
  * /api/v1/strategies - Rule-based quantitative strategies
"""
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings

# Import API Routers
from backend.app.api.v1.indicators import router as indicators_router
from backend.app.api.v1.strategies import router as strategies_router
from backend.app.api.v1.assets import router as assets_router
from backend.app.api.v1.signals import router as signals_router
from backend.app.api.v1.journal import router as journal_router
from backend.app.api.v1.schema_docs import router as schema_router
from backend.app.api.v1.market_data import router as market_data_router
from backend.app.api.v1.market_structure import router as market_structure_router
from backend.app.api.v1.setup_scoring import router as setup_scoring_router

# Import all models to ensure metadata registration
from backend.app.models import Base

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Professional Quantitative Market Analysis, Trading Research & PostgreSQL Database API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(indicators_router, prefix=settings.API_V1_STR)
app.include_router(strategies_router, prefix=settings.API_V1_STR)
app.include_router(assets_router, prefix=settings.API_V1_STR)
app.include_router(signals_router, prefix=settings.API_V1_STR)
app.include_router(journal_router, prefix=settings.API_V1_STR)
app.include_router(schema_router, prefix=settings.API_V1_STR)
app.include_router(market_data_router, prefix=settings.API_V1_STR)
app.include_router(market_structure_router, prefix=settings.API_V1_STR)
app.include_router(setup_scoring_router, prefix=settings.API_V1_STR)


@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def health_check():
    """
    Sanity health check endpoint for monitoring uptime, deployment verification,
    and Phase 2 database table registrations.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "phase": "Phase 2: PostgreSQL Database & SQLAlchemy Schema",
        "database_tables": list(Base.metadata.tables.keys()),
        "active_markets": ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD", "SPX"],
        "supported_timeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W"]
    }


@app.get(f"{settings.API_V1_STR}/markets", tags=["Market Data"])
async def list_supported_markets():
    """
    Returns list of all instruments supported across asset classes.
    """
    return {
        "markets": [
            {"symbol": "BTC/USDT", "name": "Bitcoin / Tether", "asset_class": "crypto", "base_decimals": 2, "active": True},
            {"symbol": "ETH/USDT", "name": "Ethereum / Tether", "asset_class": "crypto", "base_decimals": 2, "active": True},
            {"symbol": "SOL/USDT", "name": "Solana / Tether", "asset_class": "crypto", "base_decimals": 2, "active": True},
            {"symbol": "XAU/USD", "name": "Gold Spot", "asset_class": "commodity", "base_decimals": 2, "active": True},
            {"symbol": "EUR/USD", "name": "Euro / US Dollar", "asset_class": "forex", "base_decimals": 5, "active": True},
            {"symbol": "SPX", "name": "S&P 500 Index", "asset_class": "index", "base_decimals": 2, "active": True},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
