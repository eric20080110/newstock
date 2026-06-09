from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class HoldingIn(BaseModel):
    asset_ticker: str
    asset_name: str
    percentage: float


class PortfolioIn(BaseModel):
    name: str = "我的投資組合"
    holdings: list[HoldingIn]


class HoldingOut(BaseModel):
    id: UUID
    asset_ticker: str
    asset_name: str
    percentage: float

    class Config:
        from_attributes = True


class PortfolioOut(BaseModel):
    id: UUID
    name: str
    holdings: list[HoldingOut]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AssetAllocationOut(BaseModel):
    taiwan_etf: float
    us_etf: float
    short_treasury: float
    long_treasury: float
    short_corp: float
    long_corp: float
    gold: float
    oil: float
    cash: float


class TargetAllocationOut(BaseModel):
    total_score: float
    target: AssetAllocationOut


class CurrentHoldingsIn(BaseModel):
    taiwan_etf: float
    us_etf: float
    short_treasury: float
    long_treasury: float
    short_corp: float
    long_corp: float
    gold: float
    oil: float
    cash: float


class AdjustmentStep(BaseModel):
    month: int
    action: str


class TransitionSuggestionOut(BaseModel):
    current: CurrentHoldingsIn
    target: AssetAllocationOut
    steps: list[AdjustmentStep]
    total_months: int
    speed: str


class SuggestionOut(BaseModel):
    id: UUID
    target_allocation: str
    transition_plan: str | None
    created_at: datetime

    class Config:
        from_attributes = True
