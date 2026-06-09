from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from munger.core.auth import get_current_user
from munger.core.config import settings
from munger.core.database import get_db
from munger.core.data_fetcher import fetch_all_market_data
from munger.core.engine import MarketData, compute_allocation, compute_total_score
from munger.core.gemini_analyzer import analyze_news_sentiment
from munger.core.news_fetcher import fetch_today_news
from munger.schemas.portfolio import DailyReportOut
from munger.services.daily_report import generate_daily_report, get_latest_report, get_report_history

router = APIRouter()


def _compute_report_dict():
    import uuid
    from datetime import datetime
    articles = fetch_today_news()
    sentiment = analyze_news_sentiment(articles)
    data = fetch_all_market_data()
    md = MarketData(
        cape=data.get("cape"),
        treasury_2y=data.get("treasury_2y"),
        treasury_10y=data.get("treasury_10y"),
        vix=data.get("vix"),
        gold_return_6m=data.get("gold_return_6m"),
        oil_return_6m=data.get("oil_return_6m"),
        news_score=sentiment.get("overall_score", 50.0),
    )
    target = compute_allocation(md)
    total = compute_total_score(md)
    return {
        "id": uuid.uuid4(),
        "date": datetime.utcnow().date().isoformat(),
        "news_score": sentiment.get("overall_score", 50.0),
        "cape_score": data.get("cape") or 50.0,
        "yield_curve_score": 50.0,
        "vix_score": data.get("vix") or 50.0,
        "total_score": round(total, 1),
        "target_allocation": target.__dict__,
        "headline": sentiment.get("headline", ""),
        "key_concerns": sentiment.get("key_concerns", []),
        "key_positives": sentiment.get("key_positives", []),
        "gemini_limited": sentiment.get("gemini_limited", False),
        "created_at": datetime.utcnow(),
    }


@router.get("/daily-report", response_model=DailyReportOut)
def get_report(db: Session = Depends(get_db)):
    report = get_latest_report(db)
    if not report:
        raise HTTPException(status_code=404, detail="尚無每日報告")
    return report


@router.get("/daily-report/today", response_model=DailyReportOut)
def get_or_generate_today(db: Session = Depends(get_db)):
    try:
        return generate_daily_report(db)
    except Exception:
        return _compute_report_dict()


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
