import httpx
from datetime import datetime, timedelta

from munger.core.config import settings

NEWS_KEYWORDS = "stock market OR economy OR fed OR recession OR inflation OR interest rate OR bond market"
PAGE_SIZE = 30


def fetch_today_news() -> list[dict]:
    api_key = settings.newsapi_key
    if not api_key:
        return _mock_news()

    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    params = {
        "q": NEWS_KEYWORDS,
        "from": yesterday.isoformat(),
        "to": today.isoformat(),
        "language": "en",
        "sortBy": "relevancy",
        "pageSize": PAGE_SIZE,
        "apiKey": api_key,
    }

    try:
        resp = httpx.get("https://newsapi.org/v2/everything", params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        articles = data.get("articles", [])
        return [
            {
                "title": a.get("title", ""),
                "description": a.get("description", ""),
                "url": a.get("url", ""),
            }
            for a in articles
            if a.get("title")
        ]
    except Exception:
        return _mock_news()


def _mock_news() -> list[dict]:
    return [
        {"title": "Fed holds interest rates steady amid inflation concerns", "description": "The Federal Reserve kept interest rates unchanged.", "url": ""},
        {"title": "Stock market rally continues as tech earnings beat expectations", "description": "Major indices pushed higher.", "url": ""},
        {"title": "Treasury yields rise on strong economic data", "description": "The 10-year Treasury yield climbed.", "url": ""},
        {"title": "Oil prices fall on demand concerns", "description": "Crude oil declined.", "url": ""},
        {"title": "Gold retreats as dollar strengthens", "description": "Gold prices dipped.", "url": ""},
    ]
