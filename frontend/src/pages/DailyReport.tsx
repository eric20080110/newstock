import { useEffect, useRef, useState } from 'react'
import { BASE, type DailyReportType, type AssetAllocation } from '../api/client'
import AllocationChart from '../components/AllocationChart'
import { Card, CardContent, CardHeader } from '../components/ui/card'

export default function DailyReport() {
  const printRef = useRef<HTMLDivElement>(null)
  const [report, setReport] = useState<DailyReportType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchReport = (force = false) => {
    setLoading(true)
    setError('')
    const ctrl = new AbortController()
    fetch(`${BASE}/daily-report/today${force ? '?force=true' : ''}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text().catch(() => '')
          throw new Error(`無法取得每日報告 (${r.status}${body ? ': ' + body.slice(0, 100) : ''})`)
        }
        return r.json()
      })
      .then(setReport)
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }

  useEffect(() => fetchReport(), [])

  if (loading) return <div className="text-center py-12 text-gray-400">產生報告中…</div>
  if (error) return (
    <div className="text-center py-12 text-red-500">
      <p>{error}</p>
      <button onClick={() => fetchReport(true)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">重試</button>
    </div>
  )
  if (!report) return null

  const scoreColor =
    report.total_score >= 80 ? 'text-green-600' :
    report.total_score >= 60 ? 'text-lime-600' :
    report.total_score >= 40 ? 'text-yellow-600' :
    report.total_score >= 20 ? 'text-orange-600' : 'text-red-600'

  const scoreLabel =
    report.total_score >= 80 ? '極度貪婪' :
    report.total_score >= 60 ? '貪婪' :
    report.total_score >= 40 ? '中性' :
    report.total_score >= 20 ? '恐懼' : '極度恐懼'

  return (
    <div className="max-w-4xl mx-auto space-y-6" ref={printRef}>
      <div className="flex items-center justify-end gap-2 print:hidden">
        <button onClick={() => fetchReport(true)} className="rounded-lg bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">重新產生</button>
        <button onClick={() => window.print()} className="rounded-lg bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-700">📄 匯出 PDF</button>
      </div>
      <Card>
        <CardHeader>
          <span>📰 {report.date} 每日報告</span>
        </CardHeader>
        <CardContent>
          {report.gemini_status !== "ok" && (
            <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-700">
              {report.gemini_status === "no_key"
                ? "⚠️ 尚未設定 Gemini API Key，新聞情緒分數使用預設值（50）。請在後端環境變數設定 GEMINI_API_KEY。"
                : report.gemini_status === "quota"
                ? "⚠️ Gemini API 用量已達上限，新聞情緒分數使用預設值（50）。將於下次排程自動恢復。"
                : "⚠️ Gemini API 發生錯誤，新聞情緒分數使用預設值（50）。"}
            </div>
          )}
          {report.headline && (
            <p className="text-sm text-gray-600 mb-3">📌 {report.headline}</p>
          )}
          {report.model_used && (
            <p className="text-xs text-gray-400 mb-2">🤖 Gemini 模型：{report.model_used}</p>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl font-bold">{report.total_score}</span>
            <span className={`text-xl font-bold ${scoreColor}`}>{scoreLabel}</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden mb-4">
            <div className="h-full rounded-full" style={{ width: `${report.total_score}%`, background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }} />
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            {[
              { label: '新聞情緒', value: report.news_score },
              { label: 'CAPE', value: report.cape_score },
              { label: '殖利率曲線', value: report.yield_curve_score },
              { label: 'VIX', value: report.vix_score },
            ].map((f) => (
              <div key={f.label} className="rounded bg-gray-50 p-2 text-center">
                <div className="text-gray-400 text-xs">{f.label}</div>
                <div className="font-bold text-lg">{f.value.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {report.key_concerns && report.key_concerns.length > 0 && (
        <Card>
          <CardHeader>⚠️ 風險提示</CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {report.key_concerns.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {report.key_positives && report.key_positives.length > 0 && (
        <Card>
          <CardHeader>✅ 正面訊號</CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {report.key_positives.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>今日目標配置</CardHeader>
        <CardContent>
          <AllocationChart data={report.target_allocation as unknown as AssetAllocation} />
          <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
            {Object.entries(report.target_allocation).map(([key, val]) => (
              <div key={key} className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="text-gray-500">{key}</span>
                <span className="font-medium">{Number(val).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
