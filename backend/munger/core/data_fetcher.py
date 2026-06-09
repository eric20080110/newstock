from functools import lru_cache

from munger.core.config import settings


@lru_cache(maxsize=1)
def _get_fred():
    from fredapi import Fred
    if settings.fred_api_key:
        return Fred(api_key=settings.fred_api_key)
    return None


@lru_cache(maxsize=1)
def _yf():
    import yfinance as yf
    return yf


def fetch_cape() -> float | None:
    fred = _get_fred()
    if fred is None:
        return None
    try:
        series = fred.get_series("CAPE")
        return float(series.dropna().iloc[-1])
    except Exception:
        return None


def fetch_treasury_yields() -> dict[str, float | None]:
    fred = _get_fred()
    if fred is None:
        return {"2y": None, "10y": None}
    try:
        y2 = float(fred.get_series("DGS2").dropna().iloc[-1])
        y10 = float(fred.get_series("DGS10").dropna().iloc[-1])
        return {"2y": y2, "10y": y10}
    except Exception:
        return {"2y": None, "10y": None}


def fetch_vix_close() -> float | None:
    try:
        yf = _yf()
        vix = yf.Ticker("^VIX")
        hist = vix.history(period="5d")
        if hist.empty:
            return None
        return float(hist["Close"].iloc[-1])
    except Exception:
        return None


def fetch_asset_return_6m(ticker: str) -> float | None:
    try:
        yf = _yf()
        t = yf.Ticker(ticker)
        hist = t.history(period="6mo")
        if hist.empty or len(hist) < 2:
            return None
        start = float(hist["Close"].iloc[0])
        end = float(hist["Close"].iloc[-1])
        return (end - start) / start
    except Exception:
        return None


def fetch_all_market_data() -> dict:
    cape = fetch_cape()
    yields = fetch_treasury_yields()
    vix = fetch_vix_close()
    gold_return = fetch_asset_return_6m("GLD")
    oil_return = fetch_asset_return_6m("USO")

    return {
        "cape": cape,
        "treasury_2y": yields["2y"],
        "treasury_10y": yields["10y"],
        "vix": vix,
        "gold_return_6m": gold_return,
        "oil_return_6m": oil_return,
    }
