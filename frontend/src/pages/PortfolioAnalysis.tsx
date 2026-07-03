import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { BASE } from '../api/client'
import { Card, CardContent, CardHeader } from '../components/ui/card'

interface StockRow {
  id: number
  ticker: string
  name: string
  shares: string
  avgCost: string
  currentPrice: string
}

interface AnalysisResult {
  status: string
  risk_level: string
  summary: string
  strengths: string[]
  concerns: string[]
  suggestions: string[]
  diversification_score: number
  sector_concentration: string
  error: string
}

let nextId = 1

function emptyRow(): StockRow {
  return { id: nextId++, ticker: '', name: '', shares: '', avgCost: '', currentPrice: '' }
}

const RISK_COLORS: Record<string, string> = {
  '低風險': 'text-green-600 bg-green-50',
  '中低風險': 'text-lime-600 bg-lime-50',
  '中風險': 'text-yellow-600 bg-yellow-50',
  '中高風險': 'text-orange-600 bg-orange-50',
  '高風險': 'text-red-600 bg-red-50',
}

export default function PortfolioAnalysis() {
  const { isSignedIn, getToken } = useAuth()
  const [rows, setRows] = useState<StockRow[]>([emptyRow()])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const updateRow = (id: number, field: keyof StockRow, value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addRow = () => setRows(prev => [...prev, emptyRow()])

  const removeRow = (id: number) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev)
  }

  const handleSubmit = async () => {
    if (!isSignedIn) { setError('請先登入後再使用'); return }
    const holdings = rows
      .map(r => ({
        ticker: r.ticker.trim().toUpperCase(),
        name: r.name.trim(),
        shares: parseInt(r.shares) || 0,
        avg_cost: parseFloat(r.avgCost.replace(/,/g, '')) || 0,
        current_price: parseFloat(r.currentPrice.replace(/,/g, '')) || 0,
      }))
      .filter(h => h.ticker && h.shares > 0)

    if (holdings.length === 0) { setError('請至少輸入一個有效的持股'); return }

    setLoading(true)
    setError('')
    setResult(null)
    try {
      const token = await getToken()
      const res = await fetch(`${BASE}/portfolio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ holdings }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `請求失敗 (${res.status})`)
      }
      setResult(await res.json())
    } catch (e: any) {
      setError(e.message || '網路錯誤')
    } finally {
      setLoading(false)
    }
  }

  const totalValue = rows.reduce((sum, r) => {
    const shares = parseInt(r.shares) || 0
    const price = parseFloat(r.currentPrice.replace(/,/g, '')) || 0
    return sum + shares * price
  }, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>AI 投資組合分析</CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">輸入您的股票持股，AI 將分析風險、分散程度並提供建議</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-2 min-w-[100px]">代號</th>
                  <th className="pb-2 pr-2 min-w-[120px]">名稱</th>
                  <th className="pb-2 pr-2 min-w-[80px] text-right">股數</th>
                  <th className="pb-2 pr-2 min-w-[100px] text-right">平均成本</th>
                  <th className="pb-2 pr-2 min-w-[100px] text-right">現價</th>
                  <th className="pb-2 pr-2 min-w-[90px] text-right">市值</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const shares = parseInt(row.shares) || 0
                  const price = parseFloat(row.currentPrice.replace(/,/g, '')) || 0
                  const value = shares * price
                  return (
                    <tr key={row.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2">
                        <input value={row.ticker} onChange={(e) => updateRow(row.id, 'ticker', e.target.value)} placeholder="AAPL" className="w-full rounded border px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={row.name} onChange={(e) => updateRow(row.id, 'name', e.target.value)} placeholder="Apple" className="w-full rounded border px-2 py-1 text-sm" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="text" inputMode="numeric" value={row.shares} onChange={(e) => updateRow(row.id, 'shares', e.target.value)} placeholder="100" className="w-full rounded border px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="text" inputMode="decimal" value={row.avgCost} onChange={(e) => updateRow(row.id, 'avgCost', e.target.value)} placeholder="150.00" className="w-full rounded border px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="text" inputMode="decimal" value={row.currentPrice} onChange={(e) => updateRow(row.id, 'currentPrice', e.target.value)} placeholder="180.00" className="w-full rounded border px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-2 pr-2 text-right text-sm text-gray-600 tabular-nums">{value > 0 ? value.toLocaleString() : ''}</td>
                      <td className="py-2">
                        <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={addRow} className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">+ 新增持股</button>
            {totalValue > 0 && <span className="text-sm text-gray-400 ml-auto">總市值：{totalValue.toLocaleString()}</span>}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button onClick={handleSubmit} disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'AI 分析中…' : '提交 AI 分析'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {result && result.status === 'ok' && (
        <>
          <Card>
            <CardHeader>分析結果</CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">風險等級：</span>
                <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${RISK_COLORS[result.risk_level] || 'bg-gray-100 text-gray-600'}`}>
                  {result.risk_level}
                </span>
                <span className="text-sm text-gray-400">
                  分散程度：{result.diversification_score}/100
                </span>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">
                {result.summary}
              </div>

              {result.sector_concentration && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">產業分布</h4>
                  <p className="text-sm text-gray-700">{result.sector_concentration}</p>
                </div>
              )}

              {result.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-1">✅ 優勢</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {result.concerns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-1">⚠️ 風險與隱憂</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {result.concerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}

              {result.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-700 mb-1">💡 建議</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {result && result.status === 'error' && (
        <Card>
          <CardContent><p className="text-sm text-red-500">分析失敗：{result.error || '請稍後再試'}</p></CardContent>
        </Card>
      )}
    </div>
  )
}
