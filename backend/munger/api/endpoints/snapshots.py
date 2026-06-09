import traceback
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from munger.core.auth import get_current_user
from munger.core.database import get_db
from munger.models.portfolio import PortfolioSnapshot, UserProfile

router = APIRouter()


class SnapshotIn(BaseModel):
    name: str
    holdings: dict


class SnapshotOut(BaseModel):
    id: str
    name: str
    holdings: dict
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/snapshots", response_model=list[SnapshotOut])
def list_snapshots(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.clerk_id == user["sub"]).first()
    if not profile:
        return []
    snapshots = db.query(PortfolioSnapshot).filter(PortfolioSnapshot.user_id == profile.id).order_by(PortfolioSnapshot.created_at.desc()).all()
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "holdings": s.holdings,
            "created_at": s.created_at,
        }
        for s in snapshots
    ]


@router.post("/snapshots", response_model=SnapshotOut)
def create_snapshot(
    body: SnapshotIn,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        profile = db.query(UserProfile).filter(UserProfile.clerk_id == user["sub"]).first()
        if not profile:
            profile = UserProfile(clerk_id=user["sub"])
            db.add(profile)
            db.commit()
            db.refresh(profile)
        snap = PortfolioSnapshot(
            user_id=profile.id,
            name=body.name,
            holdings=body.holdings,
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)
        return {
            "id": str(snap.id),
            "name": snap.name,
            "holdings": snap.holdings,
            "created_at": snap.created_at,
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/snapshots/{snap_id}")
def delete_snapshot(
    snap_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.clerk_id == user["sub"]).first()
    if not profile:
        raise HTTPException(status_code=404)
    snap = db.query(PortfolioSnapshot).filter(
        PortfolioSnapshot.id == snap_id,
        PortfolioSnapshot.user_id == profile.id,
    ).first()
    if not snap:
        raise HTTPException(status_code=404)
    db.delete(snap)
    db.commit()
    return {"ok": True}
