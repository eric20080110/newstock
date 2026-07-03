from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from munger.core.auth import get_current_user
from munger.core.gemini_analyzer import analyze_stock_portfolio

router = APIRouter()


class StockHolding(BaseModel):
    ticker: str
    name: str = ""
    shares: int
    avg_cost: float
    current_price: float


class PortfolioAnalysisIn(BaseModel):
    holdings: list[StockHolding]


class PortfolioAnalysisOut(BaseModel):
    status: str
    risk_level: str = ""
    summary: str = ""
    strengths: list[str] = []
    concerns: list[str] = []
    suggestions: list[str] = []
    diversification_score: float = 0
    sector_concentration: str = ""
    error: str = ""


@router.post("/portfolio/analyze", response_model=PortfolioAnalysisOut)
def analyze_portfolio(
    body: PortfolioAnalysisIn,
    user: dict = Depends(get_current_user),
):
    if not body.holdings:
        return PortfolioAnalysisOut(status="error", error="請至少輸入一個持股")

    holdings_data = [
        {
            "ticker": h.ticker,
            "name": h.name,
            "shares": h.shares,
            "avg_cost": h.avg_cost,
            "current_price": h.current_price,
        }
        for h in body.holdings
    ]
    result = analyze_stock_portfolio(holdings_data)
    return PortfolioAnalysisOut(**result)
