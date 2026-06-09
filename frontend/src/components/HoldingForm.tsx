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

export default function HoldingForm({
  values,
  onChange,
}: {
  values: { [key: string]: number }
  onChange: (v: { [key: string]: number }) => void
}) {
  const total = Object.values(values).reduce((a, b) => a + b, 0)

  const handleChange = (key: string, val: number) => {
    onChange({ ...values, [key]: Math.max(0, Math.min(100, val)) })
  }

  return (
    <div className="space-y-3">
      {FIELDS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3">
          <label className="w-40 text-sm font-medium text-gray-700">{label}</label>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={values[key]}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
            className="flex-1 accent-blue-600"
          />
          <div className="w-20 text-right text-sm font-medium">{values[key].toFixed(1)}%</div>
        </div>
      ))}
      <div className="pt-2 text-sm font-medium text-right">
        總計：{total.toFixed(1)}%
        {Math.abs(total - 100) > 0.5 && (
          <span className="ml-2 text-red-500 text-xs">（未滿 100%）</span>
        )}
      </div>
    </div>
  )
}
