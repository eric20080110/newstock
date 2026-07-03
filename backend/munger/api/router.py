from fastapi import APIRouter

from munger.api.endpoints import allocation, daily_report, portfolio, portfolio_analysis, snapshots, stock_info, suggestion

router = APIRouter()
router.include_router(allocation.router, prefix="/api", tags=["allocation"])
router.include_router(daily_report.router, prefix="/api", tags=["daily-report"])
router.include_router(portfolio.router, prefix="/api", tags=["portfolio"])
router.include_router(portfolio_analysis.router, prefix="/api", tags=["portfolio-analysis"])
router.include_router(snapshots.router, prefix="/api", tags=["snapshots"])
router.include_router(stock_info.router, prefix="/api", tags=["stock-info"])
router.include_router(suggestion.router, prefix="/api", tags=["suggestion"])
