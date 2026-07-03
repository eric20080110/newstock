from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


def _resolve_ticker(raw: str) -> str:
    s = raw.strip().upper()
    if not s:
        raise HTTPException(status_code=400, detail="請輸入股票代碼")
    return s


def _lookup(ticker: str) -> dict:
    import yfinance as yf

    candidates = [ticker]
    if ticker.isdigit():
        candidates = [f"{ticker}.TW", ticker]

    last_err = None
    for t in candidates:
        try:
            stock = yf.Ticker(t)
            info = stock.info
            if info and info.get("regularMarketPrice") is not None:
                price = round(float(info["regularMarketPrice"]), 2)
            elif info and info.get("currentPrice") is not None:
                price = round(float(info["currentPrice"]), 2)
            else:
                hist = stock.history(period="1d")
                if hist.empty:
                    hist = stock.history(period="5d")
                if hist.empty:
                    continue
                price = round(float(hist["Close"].iloc[-1]), 2)

            name = info.get("longName") or info.get("shortName") or t
            return {"ticker": t, "name": name, "price": price}
        except Exception as e:
            last_err = e
            continue

    raise HTTPException(status_code=404, detail=f"找不到股票 {ticker}" + (f" ({last_err})" if last_err else ""))


@router.get("/stock/info")
def get_stock_info(ticker: str = Query(..., description="股票代號，如 2330 或 AAPL")):
    return _lookup(_resolve_ticker(ticker))
