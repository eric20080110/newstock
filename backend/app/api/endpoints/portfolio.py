from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.portfolio import Holding, Portfolio, UserProfile
from app.schemas.portfolio import PortfolioIn, PortfolioOut

router = APIRouter()


def _get_or_create_user(db: Session, clerk_id: str) -> UserProfile:
    user = db.query(UserProfile).filter(UserProfile.clerk_id == clerk_id).first()
    if not user:
        user = UserProfile(clerk_id=clerk_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.get("/portfolio", response_model=list[PortfolioOut])
def list_portfolios(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clerk_id = user.get("sub")
    profile = db.query(UserProfile).filter(UserProfile.clerk_id == clerk_id).first()
    if not profile:
        return []
    return db.query(Portfolio).filter(Portfolio.user_id == profile.id).all()


@router.post("/portfolio", response_model=PortfolioOut)
def create_portfolio(
    data: PortfolioIn,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    clerk_id = user.get("sub")
    profile = _get_or_create_user(db, clerk_id)
    portfolio = Portfolio(user_id=profile.id, name=data.name)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    for h in data.holdings:
        holding = Holding(
            portfolio_id=portfolio.id,
            asset_ticker=h.asset_ticker,
            asset_name=h.asset_name,
            percentage=h.percentage,
        )
        db.add(holding)
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.put("/portfolio/{portfolio_id}", response_model=PortfolioOut)
def update_portfolio(
    portfolio_id: str,
    data: PortfolioIn,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    portfolio.name = data.name
    db.query(Holding).filter(Holding.portfolio_id == portfolio.id).delete()
    for h in data.holdings:
        holding = Holding(
            portfolio_id=portfolio.id,
            asset_ticker=h.asset_ticker,
            asset_name=h.asset_name,
            percentage=h.percentage,
        )
        db.add(holding)
    db.commit()
    db.refresh(portfolio)
    return portfolio
