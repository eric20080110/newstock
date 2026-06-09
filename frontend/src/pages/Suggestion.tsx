import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { BASE, fetchTransition, fetchSnapshots, createSnapshot, deleteSnapshot, type CurrentHoldings, type TransitionSuggestion, type SnapshotInfo } from '../api/client'
import HoldingForm from '../components/HoldingForm'
import AllocationChart from '../components/AllocationChart'
import { Card, CardContent, CardHeader } from '../components/ui/card'

const defaultHoldings: Record<string, number> = {
  taiwan_etf: 0,
  us_etf: 0,
  short_treasury: 0,
  long_treasury: 0,
  short_corp: 0,
  long_corp: 0,
  gold: 0,
  oil: 0,
  cash: 0,
}

const SPEEDS = [
  { value: 'conservative', label: '保守 (±2%/月)' },
  { value: 'standard', label: '標準 (±5%/月)' },
  { value: 'aggressive', label: '積極 (±10%/月)' },
]

export default function Suggestion() {
  const { isSignedIn } = useAuth()
  const [holdings, setHoldings] = useState<Record<string, number>>(defaultHoldings)
  const [reference, setReference] = useState<Record<string, number> | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [speed, setSpeed] = useState('standard')
  const [result, setResult] = useState<TransitionSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [snapName, setSnapName] = useState('')
  const [snapshotKey, setSnapshotKey] = useState(0)
  const reportFetched = useRef(false)

  useEffect(() => {
    fetchSnapshots().then(setSnapshots)
    if (!reportFetched.current) {
      reportFetched.current = true
      fetch(`${BASE}/daily-report/today`)
        .then((r) => r.ok ? r.json() : null)
        .then((r) => { if (r?.target_allocation) setReference(r.target_allocation) })
        .catch(() => {})
    }
  }, [])

  const handleSubmit = async () => {
    if (!isSignedIn) {
      setError('請先登入後再使用持倉調整功能')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetchTransition(holdings as unknown as CurrentHoldings, speed)
      setResult(res)
    } catch (e: any) {
      setError(e.message || '網路錯誤，請確認後端服務正常')
      console.error('Suggestion error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!snapName.trim()) return
    if (!isSignedIn) {
      setError('請先登入後才能儲存持倉')
      return
    }
    setError('')
    const saveData = { ...holdings, totalAmount }
    const snap = await createSnapshot(snapName.trim(), saveData as Record<string, number>)
    if (snap) {
      setSnapshots((prev) => [snap, ...prev])
      setSnapName('')
    } else {
      setError('儲存失敗，請確認已登入')
    }
  }

  const loadSnapshot = (s: SnapshotInfo) => {
    const amt = (s.holdings as any).totalAmount || 0
    const pcts = { ...s.holdings } as Record<string, number>
    delete (pcts as any).totalAmount
    setHoldings(pcts)
    setTotalAmount(amt)
    setSnapshotKey(k => k + 1)
  }

  const handleDelete = async (id: string) => {
    if (await deleteSnapshot(id)) {
      setSnapshots((prev) => prev.filter((s) => s.id !== id))
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>輸入目前持倉</CardHeader>
        <CardContent>
          <HoldingForm key={snapshotKey} values={holdings} onChange={setHoldings} reference={reference ?? undefined} totalAmount={totalAmount} onTotalAmountChange={setTotalAmount} />
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium">調整速度：</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="rounded border px-3 py-1 text-sm"
            >
              {SPEEDS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '計算中…' : '產生轉換建議'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <div className="mt-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <input
                value={snapName}
                onChange={(e) => setSnapName(e.target.value)}
                placeholder="儲存目前持倉…"
                className="rounded border px-3 py-1.5 text-sm flex-1"
              />
              <button onClick={handleSave} disabled={!snapName.trim()} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50">儲存</button>
            </div>
            {snapshots.length > 0 ? (
              <div className="mt-3 space-y-1">
                {snapshots.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-sm">
                    <button onClick={() => loadSnapshot(s)} className="flex-1 text-left hover:text-blue-600">{s.name}</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-xs">刪除</button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400">尚未儲存任何持倉</p>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>目前配置</CardHeader>
              <CardContent><AllocationChart data={result.current} /></CardContent>
            </Card>
            <Card>
              <CardHeader>目標配置</CardHeader>
              <CardContent><AllocationChart data={result.target} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>轉換計劃 ({result.total_months > 0 ? `${result.total_months} 個月` : '無需調整'})</CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.steps.map((step) => (
                  <div key={step.month} className="rounded-lg border bg-gray-50 px-4 py-2 text-sm">
                    <span className="font-medium text-gray-600">第 {step.month} 個月：</span>
                    {step.action}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
