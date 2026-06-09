import json

from munger.core.config import settings


def analyze_news_sentiment(articles: list[dict]) -> dict:
    api_key = settings.gemini_api_key
    if not api_key:
        return {"overall_score": 50.0, "headline": "", "key_concerns": [], "key_positives": [], "gemini_limited": True}

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
        model = genai.GenerativeModel("gemini-2.0-flash-lite")
        resp = model.generate_content(prompt)
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
            "gemini_limited": False,
        }
    except Exception as e:
        err_str = str(e).lower()
        is_quota = "quota" in err_str or "rate" in err_str or "resource exhausted" in err_str or "429" in err_str
        return {
            "overall_score": 50.0,
            "headline": "",
            "key_concerns": [],
            "key_positives": [],
            "gemini_limited": is_quota,
        }
