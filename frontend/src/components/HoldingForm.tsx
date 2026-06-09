import { useRef, useState } from 'react'

const FIELDS = [
  { key: 'taiwan_etf', label: '台股 ETF (0050)' },
  { key: 'us_etf', label: '美股 ETF (VTI)' },
  { key: 'short_treasury', label: '短天期公債 (SHV)' },
  { key: 'long_treasury', label: '長天期公債 (TLT)' },
  { key: 'short_corp', label: '短天期公司債 (VCSH)' },
  { key: 'long_corp', label: '長天期公司債 (VCLT)' },
  { key: 'gold', label: '黃金 (GLD)' },
  { key: 'oil', label: '石油 (USO)' },
  { key: 'cash', label: '現金' },
]

function parseInput(v: string): number {
  const n = parseFloat(v.replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

function normalizePcts(map: Record<string, number>): Record<string, number> {
  const total = Object.values(map).reduce((a, b) => a + b, 0)
  if (Math.abs(total - 100) < 0.01) return map
  const diff = Math.round((100 - total) * 10) / 10
  const keys = Object.keys(map)
  const maxK = keys.reduce((a, b) => map[a] > map[b] ? a : b)
  return { ...map, [maxK]: Math.round((map[maxK] + diff) * 10) / 10 }
}

export default function HoldingForm({
  values,
  onChange,
  reference,
  totalAmount = 0,
  onTotalAmountChange,
}: {
  values: { [key: string]: number }
  onChange: (v: { [key: string]: number }) => void
  reference?: { [key: string]: number }
  totalAmount?: number
  onTotalAmountChange?: (v: number) => void
}) {
  const [amtStrings, setAmtStrings] = useState<Record<string, string>>({})
  const amtStringsRef = useRef(amtStrings)
  amtStringsRef.current = amtStrings

  const total = Object.values(values).reduce((a, b) => a + b, 0)

  const handleSlider = (key: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, val))
    onChange({ ...values, [key]: clamped })
    setAmtStrings((prev) => {
      if (prev[key] === undefined) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleAmountInput = (key: string, raw: string) => {
    setAmtStrings((prev) => ({ ...prev, [key]: raw }))

    const num = parseInput(raw)
    const current = amtStringsRef.current
    const amts: Record<string, number> = {}

    for (const f of FIELDS) {
      const k = f.key
      if (k === key) {
        amts[k] = num
      } else if (current[k] !== undefined) {
        amts[k] = parseInput(current[k])
      } else if (totalAmount > 0) {
        amts[k] = (values[k] / 100) * totalAmount
      } else {
        amts[k] = 0
      }
    }

    const sum = Object.values(amts).reduce((a, b) => a + b, 0)
    if (sum > 0) {
      const pcts: Record<string, number> = {}
      for (const f of FIELDS) {
        pcts[f.key] = Math.round(((amts[f.key] || 0) / sum) * 1000) / 10
      }
      onChange(normalizePcts(pcts))
      onTotalAmountChange?.(Math.round(sum))
    }
  }

  const displayAmt = (key: string, pct: number): string => {
    if (amtStrings[key] !== undefined) return amtStrings[key]
    if (totalAmount > 0) return Math.round((pct / 100) * totalAmount).toLocaleString()
    return ''
  }

  return (
    <div className="space-y-3">
      {onTotalAmountChange && (
        <div className="flex items-center gap-3 pb-2 border-b">
          <label className="w-40 text-sm font-medium text-gray-700">總金額</label>
          <input
            type="text"
            inputMode="decimal"
            value={totalAmount > 0 ? totalAmount.toLocaleString() : ''}
            onChange={(e) => onTotalAmountChange(parseInput(e.target.value))}
            placeholder="先輸入總金額或直接在各項輸入金額"
            className="rounded border px-3 py-1.5 text-sm w-60 text-right text-gray-500"
          />
          <span className="text-sm text-gray-500">元</span>
        </div>
      )}

      {FIELDS.map(({ key, label }) => {
        const pct = values[key]
        const refPct = reference?.[key]

        return (
          <div key={key}>
            <div className="flex items-center gap-3">
              <label className="w-40 text-sm font-medium text-gray-700 truncate" title={label}>{label}</label>
              <div className="relative flex-1 h-6">
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                {refPct !== undefined && (
                  <div className="absolute top-0 w-0.5 bg-red-400 rounded-full" style={{ left: `${refPct}%`, height: '100%', transform: 'translateX(-50%)' }} />
                )}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={pct}
                  onChange={(e) => handleSlider(key, parseFloat(e.target.value))}
                  className="absolute inset-0 w-full cursor-pointer opacity-0 z-10"
                />
              </div>
              <div className="w-14 text-right text-sm font-medium tabular-nums">{pct.toFixed(1)}%</div>
              {onTotalAmountChange && (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayAmt(key, pct)}
                    onChange={(e) => handleAmountInput(key, e.target.value)}
                    placeholder="0"
                    className="rounded border px-2 py-1 text-xs w-24 text-right tabular-nums"
                  />
                  <span className="text-xs text-gray-400 w-6">元</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 pl-40">
              {refPct !== undefined && (
                <span className="text-xs text-gray-400">
                  目標 {refPct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )
      })}

      <div className="pt-2 text-sm font-medium text-right">
        總計：{total.toFixed(1)}%
        {Math.abs(total - 100) > 0.5 && (
          <span className="ml-2 text-red-500 text-xs">（未滿 100%）</span>
        )}
      </div>
    </div>
  )
}
