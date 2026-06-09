import { useCallback } from 'react'

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
  const total = Object.values(values).reduce((a, b) => a + b, 0)

  const handleChange = useCallback(
    (key: string, val: number) => {
      onChange({ ...values, [key]: Math.max(0, Math.min(100, val)) })
    },
    [values, onChange]
  )

  const handleAmountChange = useCallback(
    (key: string, amountStr: string) => {
      const amount = parseInput(amountStr)
      if (totalAmount <= 0) return
      const pct = (amount / totalAmount) * 100
      onChange({ ...values, [key]: Math.max(0, Math.min(100, pct)) })
    },
    [totalAmount, values, onChange]
  )

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
            placeholder="0"
            className="rounded border px-3 py-1.5 text-sm w-40 text-right"
          />
          <span className="text-sm text-gray-500">元</span>
        </div>
      )}

      {FIELDS.map(({ key, label }) => {
        const pct = values[key]
        const amount = totalAmount > 0 ? (pct / 100) * totalAmount : 0
        const refPct = reference?.[key]

        return (
          <div key={key}>
            <div className="flex items-center gap-3">
              <label className="w-40 text-sm font-medium text-gray-700 truncate" title={label}>{label}</label>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={pct}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <div className="w-14 text-right text-sm font-medium tabular-nums">{pct.toFixed(1)}%</div>
              {onTotalAmountChange && (
                <>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount > 0 ? Math.round(amount).toLocaleString() : ''}
                    onChange={(e) => handleAmountChange(key, e.target.value)}
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
