from fastapi import APIRouter, Depends

from munger.core.auth import get_optional_user
from munger.core.data_fetcher import fetch_all_market_data
from munger.core.engine import MarketData, compute_allocation, compute_total_score
from munger.schemas.portfolio import AssetAllocationOut, TargetAllocationOut

router = APIRouter()


@router.get("/allocation", response_model=TargetAllocationOut)
def get_allocation(user: dict | None = Depends(get_optional_user)):
    data = fetch_all_market_data()
    md = MarketData(**data)
    target = compute_allocation(md)
    score = compute_total_score(md)
    return TargetAllocationOut(
        total_score=round(score, 1),
        target=AssetAllocationOut(**target.__dict__),
    )
