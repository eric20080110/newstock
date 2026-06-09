import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE, type TargetAllocation, type DailyReportType } from '../api/client'
import AllocationChart from '../components/AllocationChart'
import HistoryChart from '../components/HistoryChart'
import { Card, CardContent, CardHeader } from '../components/ui/card'

export default function Dashboard() {
  const [data, setData] = useState<TargetAllocation | null>(null)
  const [report, setReport] = useState<DailyReportType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    Promise.all([
      fetch(`${BASE}/allocation`, { signal: ctrl.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json() }),
      fetch(`${BASE}/daily-report`, { signal: ctrl.signal }).then((r) => r.ok ? r.json() : null),
    ])
      .then(([alloc, rpt]) => {
        setData(alloc)
        setReport(rpt)
      })
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">載入中…</div>
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>
  if (!data) return null

  const scoreLabel =
    data.total_score >= 80 ? '極度貪婪' :
    data.total_score >= 60 ? '貪婪' :
    data.total_score >= 40 ? '中性' :
    data.total_score >= 20 ? '恐懼' : '極度恐懼'

  const scoreColor =
    data.total_score >= 80 ? 'text-green-600' :
    data.total_score >= 60 ? 'text-lime-600' :
    data.total_score >= 40 ? 'text-yellow-600' :
    data.total_score >= 20 ? 'text-orange-600' : 'text-red-600'

  const isExtreme = data.total_score <= 20 || data.total_score >= 80

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isExtreme && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium text-white ${data.total_score <= 20 ? 'bg-red-600' : 'bg-green-600'}`}>
          {data.total_score <= 20 ? '🔴 市場極度恐慌 — 建議謹慎操作，檢視每日報告獲取詳細分析' : '🟢 市場極度貪婪 — 注意高檔風險，檢視每日報告獲取詳細分析'}
        </div>
      )}
      {report?.date && (
        <div className="text-right text-xs text-gray-400">
          最後報告：{report.date}　<Link to="/daily-report" className="text-blue-600 hover:underline">檢視詳情 →</Link>
        </div>
      )}
      <Card>
        <CardHeader>蒙格市場溫度計</CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-4xl font-bold">{data.total_score}</span>
              <span className="text-gray-400 ml-2">/ 100</span>
            </div>
            <div className={`text-2xl font-bold ${scoreColor}`}>{scoreLabel}</div>
          </div>
          <div className="mt-3 h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${data.total_score}%`,
                background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)',
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>歷史趨勢</CardHeader>
        <CardContent>
          <HistoryChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>蒙格目標配置</CardHeader>
        <CardContent>
          <AllocationChart data={data.target} />
          <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
            {Object.entries(data.target).map(([key, val]) => (
              <div key={key} className="flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="text-gray-500">{key}</span>
                <span className="font-medium">{val.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
