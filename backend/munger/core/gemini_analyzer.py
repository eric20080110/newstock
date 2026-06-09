import json
import logging

from munger.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview-05-06",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
]


def analyze_news_sentiment(articles: list[dict]) -> dict:
    api_key = settings.gemini_api_key
    if not api_key:
        logger.warning("GEMINI_API_KEY not configured")
        return {"overall_score": 50.0, "headline": "", "key_concerns": [], "key_positives": [], "gemini_status": "no_key"}

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
        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(model_name)
                resp = model.generate_content(prompt)
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
        }
