from dataclasses import dataclass


@dataclass
class MarketData:
    cape: float | None
    treasury_2y: float | None
    treasury_10y: float | None
    vix: float | None
    gold_return_6m: float | None
    oil_return_6m: float | None
    news_score: float | None = None


@dataclass
class AssetAllocation:
    taiwan_etf: float = 0.0
    us_etf: float = 0.0
    short_treasury: float = 0.0
    long_treasury: float = 0.0
    short_corp: float = 0.0
    long_corp: float = 0.0
    gold: float = 0.0
    oil: float = 0.0
    cash: float = 0.0


def _score_cape(cape: float | None) -> float:
    if cape is None:
        return 50.0
    if cape <= 15:
        return 95.0
    if cape >= 40:
        return 5.0
    return 95.0 - (cape - 15) * (90.0 / 25.0)


def _score_yield_curve(y2: float, y10: float) -> float:
    if y2 is None or y10 is None:
        return 50.0
    spread = y10 - y2
    if spread >= 1.5:
        return 95.0
    if spread <= -1.0:
        return 5.0
    return 50.0 + (spread - 0.25) * (45.0 / 1.25)


def _score_vix(vix: float | None) -> float:
    if vix is None:
        return 50.0
    if vix <= 12:
        return 95.0
    if vix >= 40:
        return 5.0
    return 95.0 - (vix - 12) * (90.0 / 28.0)


def compute_total_score(data: MarketData) -> float:
    s_cape = _score_cape(data.cape)
    s_curve = _score_yield_curve(data.treasury_2y, data.treasury_10y)
    s_vix = _score_vix(data.vix)
    s_news = data.news_score if data.news_score is not None else 50.0

    has_news = data.news_score is not None
    if has_news:
        return s_cape * 0.35 + s_curve * 0.30 + s_vix * 0.25 + s_news * 0.10
    return s_cape * 0.40 + s_curve * 0.35 + s_vix * 0.25


def _lerp(low_score, high_score, low_val, high_val, score):
    if score <= low_score:
        return low_val
    if score >= high_score:
        return high_val
    t = (score - low_score) / (high_score - low_score)
    return low_val + t * (high_val - low_val)


ALLOCATION_TABLE = [
    (80, 60, 15, 15, 10),
    (60, 50, 25, 15, 10),
    (40, 35, 35, 15, 15),
    (20, 20, 45, 20, 15),
    (0, 10, 45, 20, 25),
]


def _bucket_allocation(total_score: float) -> tuple[float, float, float, float]:
    for i, (threshold, eq, fi, cm, ca) in enumerate(ALLOCATION_TABLE):
        if total_score >= threshold:
            if i == 0:
                return eq, fi, cm, ca
            prev_threshold, prev_eq, prev_fi, prev_cm, prev_ca = ALLOCATION_TABLE[i - 1]
            t = (total_score - prev_threshold) / (threshold - prev_threshold) if threshold != prev_threshold else 0
            return (
                prev_eq + t * (eq - prev_eq),
                prev_fi + t * (fi - prev_fi),
                prev_cm + t * (cm - prev_cm),
                prev_ca + t * (ca - prev_ca),
            )
    return ALLOCATION_TABLE[-1][1], ALLOCATION_TABLE[-1][2], ALLOCATION_TABLE[-1][3], ALLOCATION_TABLE[-1][4]


BOND_TABLE = [
    (1.0, 15, 35, 15, 35),
    (0.25, 20, 30, 20, 30),
    (-0.25, 30, 20, 30, 20),
    (-1.0, 40, 15, 35, 10),
]


def _subdivide_bonds(spread: float | None, fi_pct: float) -> tuple[float, float, float, float]:
    if spread is None:
        spread = 0.25
    for i, (th, st, lt, sc, lc) in enumerate(BOND_TABLE):
        if spread >= th:
            if i == 0:
                return fi_pct * st / 100, fi_pct * lt / 100, fi_pct * sc / 100, fi_pct * lc / 100
            prev_th, prev_st, prev_lt, prev_sc, prev_lc = BOND_TABLE[i - 1]
            t = (spread - prev_th) / (th - prev_th) if th != prev_th else 0
            return (
                fi_pct * (prev_st + t * (st - prev_st)) / 100,
                fi_pct * (prev_lt + t * (lt - prev_lt)) / 100,
                fi_pct * (prev_sc + t * (sc - prev_sc)) / 100,
                fi_pct * (prev_lc + t * (lc - prev_lc)) / 100,
            )
    return fi_pct * 40 / 100, fi_pct * 15 / 100, fi_pct * 35 / 100, fi_pct * 10 / 100


def _subdivide_commodities(gold_return: float | None, oil_return: float | None, cm_pct: float) -> tuple[float, float]:
    if gold_return is None or oil_return is None:
        return cm_pct * 0.5, cm_pct * 0.5
    diff = gold_return - oil_return
    if diff >= 0.10:
        return cm_pct * 0.8, cm_pct * 0.2
    if diff <= -0.10:
        return cm_pct * 0.2, cm_pct * 0.8
    t = (diff + 0.10) / 0.20
    gold_pct = (0.2 + t * 0.6) * cm_pct
    oil_pct = cm_pct - gold_pct
    return gold_pct, oil_pct


def compute_allocation(data: MarketData) -> AssetAllocation:
    total_score = compute_total_score(data)
    eq_pct, fi_pct, cm_pct, ca_pct = _bucket_allocation(total_score)
    spread = None
    if data.treasury_2y is not None and data.treasury_10y is not None:
        spread = data.treasury_10y - data.treasury_2y
    st, lt, sc, lc = _subdivide_bonds(spread, fi_pct)
    gold_pct, oil_pct = _subdivide_commodities(data.gold_return_6m, data.oil_return_6m, cm_pct)
    us_eq = eq_pct * 0.65
    tw_eq = eq_pct * 0.35
    return AssetAllocation(
        taiwan_etf=round(tw_eq, 1),
        us_etf=round(us_eq, 1),
        short_treasury=round(st, 1),
        long_treasury=round(lt, 1),
        short_corp=round(sc, 1),
        long_corp=round(lc, 1),
        gold=round(gold_pct, 1),
        oil=round(oil_pct, 1),
        cash=round(ca_pct, 1),
    )
