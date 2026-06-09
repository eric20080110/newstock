import json
from datetime import datetime

from sqlalchemy.orm import Session

from munger.core.data_fetcher import fetch_all_market_data
from munger.core.engine import MarketData, compute_allocation, compute_total_score
from munger.core.gemini_analyzer import analyze_news_sentiment
from munger.core.news_fetcher import fetch_today_news
from munger.models.portfolio import DailyReport


def generate_daily_report(db: Session, force: bool = False) -> DailyReport:
    today = datetime.utcnow().date()

    existing = db.query(DailyReport).filter(DailyReport.date == today).first()
    if existing and not force:
        return existing

    articles = fetch_today_news()
    sentiment = analyze_news_sentiment(articles)
    data = fetch_all_market_data()
    md = MarketData(
        cape=data["cape"],
        treasury_2y=data["treasury_2y"],
        treasury_10y=data["treasury_10y"],
        vix=data["vix"],
        gold_return_6m=data["gold_return_6m"],
        oil_return_6m=data["oil_return_6m"],
        news_score=sentiment["overall_score"],
    )
    target = compute_allocation(md)
    total = compute_total_score(md)

    gemini_status = sentiment.get("gemini_status", "error")

    if existing:
        existing.news_score = sentiment["overall_score"]
        existing.cape_score = _safe_score(data["cape"])
        existing.yield_curve_score = _safe_score(None)
        existing.vix_score = _safe_score(data["vix"])
        existing.total_score = round(total, 1)
        existing.target_allocation = target.__dict__
        existing.headline = sentiment.get("headline")
        existing.key_concerns = sentiment.get("key_concerns")
        existing.key_positives = sentiment.get("key_positives")
        existing.gemini_status = gemini_status
        db.commit()
        db.refresh(existing)
        return existing

    report = DailyReport(
        date=today,
        news_score=sentiment["overall_score"],
        cape_score=_safe_score(data["cape"]),
        yield_curve_score=_safe_score(None),
        vix_score=_safe_score(data["vix"]),
        total_score=round(total, 1),
        target_allocation=target.__dict__,
        headline=sentiment.get("headline"),
        key_concerns=sentiment.get("key_concerns"),
        key_positives=sentiment.get("key_positives"),
        gemini_status=gemini_status,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def get_latest_report(db: Session) -> DailyReport | None:
    return db.query(DailyReport).order_by(DailyReport.date.desc()).first()


def get_report_history(db: Session, limit: int = 30) -> list[DailyReport]:
    return (
        db.query(DailyReport)
        .order_by(DailyReport.date.desc())
        .limit(limit)
        .all()
    )


def _safe_score(val: float | None) -> float:
    if val is None:
        return 50.0
    return float(val)
