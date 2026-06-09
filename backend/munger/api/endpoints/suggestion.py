import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from munger.core.auth import get_current_user
from munger.core.database import get_db
from munger.core.data_fetcher import fetch_all_market_data
from munger.core.engine import MarketData, compute_allocation
from munger.models.portfolio import Suggestion, UserProfile
from munger.schemas.portfolio import CurrentHoldingsIn, TransitionSuggestionOut
from munger.services.transition import compute_transition

router = APIRouter()


@router.post("/suggestion/transition", response_model=TransitionSuggestionOut)
def get_transition_suggestion(
    current: CurrentHoldingsIn,
    speed: str = "standard",
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = fetch_all_market_data()
    md = MarketData(**data)
    target = compute_allocation(md)
    result = compute_transition(current, target, speed)

    clerk_id = user.get("sub")
    profile = db.query(UserProfile).filter(UserProfile.clerk_id == clerk_id).first()
    if not profile:
        profile = UserProfile(clerk_id=clerk_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    db_suggestion = Suggestion(
        user_id=profile.id,
        market_data_snapshot=json.dumps(data, default=str),
        target_allocation=json.dumps(target.model_dump()),
        transition_plan=json.dumps([s.model_dump() for s in result.steps]),
    )
    db.add(db_suggestion)
    db.commit()

    return result
