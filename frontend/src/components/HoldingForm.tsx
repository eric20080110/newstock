import { Card, CardContent } from './ui/card'

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

  const handleChange = (key: string, val: string) => {
    const num = parseFloat(val) || 0
    onChange({ ...values, [key]: Math.max(0, Math.min(100, num)) })
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-3">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-40 text-sm font-medium text-gray-700">{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-24 rounded border px-2 py-1 text-sm"
              />
              <span className="text-xs text-gray-400">%</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${values[key]}%` }}
                />
              </div>
            </div>
          ))}
          <div className="pt-2 text-sm font-medium text-right">
            總計：{total.toFixed(1)}%
            {Math.abs(total - 100) > 0.5 && (
              <span className="ml-2 text-red-500 text-xs">（未滿 100%）</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
