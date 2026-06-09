from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from munger.core.auth import get_current_user
from munger.core.config import settings
from munger.core.database import get_db
from munger.schemas.portfolio import DailyReportOut
from munger.services.daily_report import generate_daily_report, get_latest_report, get_report_history

router = APIRouter()


@router.get("/daily-report", response_model=DailyReportOut)
def get_report(db: Session = Depends(get_db)):
    report = get_latest_report(db)
    if not report:
        raise HTTPException(status_code=404, detail="尚無每日報告")
    return report


@router.get("/daily-report/today", response_model=DailyReportOut)
def get_or_generate_today(db: Session = Depends(get_db)):
    return generate_daily_report(db)


@router.post("/daily-report/generate", response_model=DailyReportOut)
def trigger_generate(
    force: bool = Query(False),
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_daily_report(db, force=force)


@router.get("/daily-report/history", response_model=list[DailyReportOut])
def get_history(limit: int = Query(30), db: Session = Depends(get_db)):
    return get_report_history(db, limit=limit)


@router.get("/cron/daily-report", response_model=DailyReportOut)
def cron_trigger(token: str = Query(...), db: Session = Depends(get_db)):
    if not settings.cron_secret or token != settings.cron_secret:
        raise HTTPException(status_code=403, detail="Invalid cron token")
    return generate_daily_report(db)
