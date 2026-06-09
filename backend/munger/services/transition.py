from munger.schemas.portfolio import AdjustmentStep, AssetAllocationOut, CurrentHoldingsIn, TransitionSuggestionOut

SPEED_LIMITS = {
    "conservative": 0.02,
    "standard": 0.05,
    "aggressive": 0.10,
}

ASSET_KEYS = [
    "taiwan_etf",
    "us_etf",
    "short_treasury",
    "long_treasury",
    "short_corp",
    "long_corp",
    "gold",
    "oil",
    "cash",
]


def compute_transition(
    current: CurrentHoldingsIn,
    target: AssetAllocationOut,
    speed: str = "standard",
) -> TransitionSuggestionOut:
    limit = SPEED_LIMITS.get(speed, 0.05)
    current_dict = current.model_dump()
    target_dict = target.model_dump()

    total_gap = 0.0
    for key in ASSET_KEYS:
        total_gap += abs(current_dict[key] - target_dict[key])
    total_gap /= 2.0

    if total_gap < 3.0:
        return TransitionSuggestionOut(
            current=current,
            target=target,
            steps=[AdjustmentStep(month=1, action="差距小於 3%，建議保持當前配置不動。")],
            total_months=0,
            speed=speed,
        )

    max_adjust_per_month = limit * 100
    total_months = max(1, round(total_gap / max_adjust_per_month))
    steps = []

    temp = dict(current_dict)
    for month in range(1, total_months + 1):
        remaining = total_months - month + 1
        actions = []
        for key in ASSET_KEYS:
            diff = target_dict[key] - temp[key]
            adj = diff / remaining
            adj = round(max(-limit * 100, min(limit * 100, adj)), 1)
            if abs(adj) > 0.1:
                action = "買" if adj > 0 else "賣"
                actions.append(f"{action} {abs(adj):.1f}% {_label(key)}")
                temp[key] += adj
        if actions:
            steps.append(AdjustmentStep(month=month, action="；".join(actions)))

    return TransitionSuggestionOut(
        current=current,
        target=target,
        steps=steps,
        total_months=total_months,
        speed=speed,
    )


def _label(key: str) -> str:
    labels = {
        "taiwan_etf": "台股 ETF",
        "us_etf": "美股 ETF",
        "short_treasury": "短天期公債",
        "long_treasury": "長天期公債",
        "short_corp": "短天期公司債",
        "long_corp": "長天期公司債",
        "gold": "黃金",
        "oil": "石油",
        "cash": "現金",
    }
    return labels.get(key, key)
