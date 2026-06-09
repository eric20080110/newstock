import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { BASE } from '../api/client'

interface HistoryItem {
  date: string
  total_score: number
  news_score: number
  cape_score: number
  yield_curve_score: number
  vix_score: number
}

export default function HistoryChart() {
  const [data, setData] = useState<HistoryItem[]>([])

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`${BASE}/daily-report/history?limit=30`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((items: HistoryItem[]) => setData(items.reverse()))
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  if (data.length < 2) return null

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="total_score" name="總分" stroke="#111827" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="news_score" name="新聞" stroke="#3b82f6" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="cape_score" name="CAPE" stroke="#10b981" strokeWidth={1} dot={false} />
          <Line type="monotone" dataKey="vix_score" name="VIX" stroke="#ef4444" strokeWidth={1} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
