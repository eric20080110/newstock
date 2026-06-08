from fastapi import APIRouter

from app.api.endpoints import allocation, portfolio, suggestion

router = APIRouter()
router.include_router(allocation.router, prefix="/api", tags=["allocation"])
router.include_router(portfolio.router, prefix="/api", tags=["portfolio"])
router.include_router(suggestion.router, prefix="/api", tags=["suggestion"])
