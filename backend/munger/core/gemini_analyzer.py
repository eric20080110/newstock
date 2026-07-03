import json
import logging

from munger.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-tts",
]


def analyze_stock_portfolio(holdings: list[dict]) -> dict:
    api_key = settings.gemini_api_key
    if not api_key:
        return {"status": "no_key", "error": "GEMINI_API_KEY not configured"}

    total_value = sum(h["shares"] * h["current_price"] for h in holdings)
    enriched = []
    for h in holdings:
        value = h["shares"] * h["current_price"]
        cost = h["shares"] * h["avg_cost"]
        enriched.append({
            **h,
            "value": round(value, 2),
            "cost_basis": round(cost, 2),
            "pnl": round(value - cost, 2),
            "pnl_pct": round((value - cost) / cost * 100, 1) if cost else 0,
            "weight_pct": round(value / total_value * 100, 1) if total_value else 0,
        })

    portfolio_text = json.dumps(enriched, ensure_ascii=False, indent=2)

    prompt = f"""You are a professional investment analyst. Analyze the following stock portfolio and provide insights in Chinese.

Return ONLY valid JSON (no markdown, no code block):
{{
  "risk_level": "<低風險|中低風險|中風險|中高風險|高風險>",
  "summary": "<2-3 sentence Chinese summary of the portfolio's overall condition>",
  "strengths": ["<strength 1 in Chinese>", "<strength 2>", ...],
  "concerns": ["<concern 1 in Chinese>", "<concern 2>", ...],
  "suggestions": ["<suggestion 1 in Chinese>", "<suggestion 2>", ...],
  "diversification_score": <0-100>,
  "sector_concentration": "<Chinese analysis of sector/distribution>"
}}

Portfolio (total value: {total_value:.2f}):
{portfolio_text}"""

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        last_err = None
        resp = None
        model_used = None
        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(model_name)
                resp = model.generate_content(prompt)
                model_used = model_name
                last_err = None
                break
            except Exception as e:
                last_err = e
                continue

        if resp is None:
            raise last_err or Exception("all Gemini models failed")
        text = resp.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            text = text.rsplit("```", 1)[0]
        result = json.loads(text)
        return {
            "status": "ok",
            "risk_level": result.get("risk_level", "中風險"),
            "summary": result.get("summary", ""),
            "strengths": result.get("strengths", []),
            "concerns": result.get("concerns", []),
            "suggestions": result.get("suggestions", []),
            "diversification_score": float(result.get("diversification_score", 50)),
            "sector_concentration": result.get("sector_concentration", ""),
            "model_used": model_used,
        }
    except Exception as e:
        err = str(e)
        logger.error("Gemini portfolio analysis error: %s", err)
        return {"status": "error", "error": str(err)[:300]}


def analyze_news_sentiment(articles: list[dict]) -> dict:
    api_key = settings.gemini_api_key
    if not api_key:
        logger.warning("GEMINI_API_KEY not configured")
        return {"overall_score": 50.0, "headline": "", "key_concerns": [], "key_positives": [], "gemini_status": "no_key", "model_used": None}

    news_text = "\n\n".join(
        f"Title: {a['title']}\nSummary: {a.get('description', '')}"
        for a in articles[:20]
    )

    prompt = f"""You are a financial sentiment analyst. Analyze these today's financial news headlines and determine an overall market sentiment score from 0 (extremely bearish/恐慌) to 100 (extremely bullish/貪婪), where 50 is neutral.

Return ONLY valid JSON (no markdown, no code block):
{{
  "overall_score": <0-100>,
  "headline": "<one-line summary of today's market tone in Chinese>",
  "key_concerns": ["<concern 1>", "<concern 2>", ...],
  "key_positives": ["<positive 1>", "<positive 2>", ...]
}}

Today's news:
{news_text}"""

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        last_err = None
        resp = None
        model_used = None
        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(model_name)
                resp = model.generate_content(prompt)
                model_used = model_name
                last_err = None
                break
            except Exception as e:
                last_err = e
                continue

        if resp is None:
            raise last_err or Exception("all Gemini models failed")
        text = resp.text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            text = text.rsplit("```", 1)[0]
        result = json.loads(text)
        score = float(result.get("overall_score", 50))
        score = max(0, min(100, score))
        return {
            "overall_score": score,
            "headline": result.get("headline", ""),
            "key_concerns": result.get("key_concerns", []),
            "key_positives": result.get("key_positives", []),
            "gemini_status": "ok",
            "model_used": model_used,
        }
    except Exception as e:
        err = str(e)
        logger.error("Gemini API error: %s", err)
        err_lower = err.lower()
        is_quota = "quota" in err_lower or "rate limit" in err_lower or "resource exhausted" in err_lower or "429" in err_lower
        return {
            "overall_score": 50.0,
            "headline": "",
            "key_concerns": [],
            "key_positives": [],
            "gemini_status": "quota" if is_quota else "error",
            "gemini_error": err[:200] if err else None,
            "model_used": None,
        }
