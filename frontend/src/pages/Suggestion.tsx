import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { BASE, fetchTransition, fetchSnapshots, deleteSnapshot, type CurrentHoldings, type TransitionSuggestion, type SnapshotInfo } from '../api/client'
import { useAuthStore } from '../store/authStore'
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
  const reportFetched = useRef(false)
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [saveName, setSaveName] = useState('')
  const [selectedSnapId, setSelectedSnapId] = useState('')

  useEffect(() => {
    if (!reportFetched.current) {
      reportFetched.current = true
      fetch(`${BASE}/daily-report/today`)
        .then((r) => r.ok ? r.json() : null)
        .then((r) => { if (r?.target_allocation) setReference(r.target_allocation) })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (isSignedIn) {
      fetchSnapshots().then(setSnapshots).catch(() => {})
    }
  }, [isSignedIn])

  const handleLoad = (snapId: string) => {
    setSelectedSnapId(snapId)
    const snap = snapshots.find(s => s.id === snapId)
    if (!snap) return
    const { _totalAmount, ...pcts } = snap.holdings as Record<string, number>
    setHoldings(pcts)
    if (_totalAmount) setTotalAmount(_totalAmount)
  }

  const handleSave = async () => {
    if (!isSignedIn || !saveName.trim()) return
    const snapData = { ...holdings, _totalAmount: totalAmount }
    const token = useAuthStore.getState().token
    const res = await fetch(`${BASE}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: saveName.trim(), holdings: snapData }),
    })
    if (res.ok) {
      const result = await res.json()
      setSnapshots(prev => [result, ...prev])
      setSaveName('')
    } else {
      const text = await res.text().catch(() => '')
      setError(`儲存失敗 (${res.status}${text ? ': ' + text.slice(0, 200) : ''})`)
    }
  }

  const handleDelete = async (snapId: string) => {
    if (await deleteSnapshot(snapId)) {
      setSnapshots(prev => prev.filter(s => s.id !== snapId))
      if (selectedSnapId === snapId) setSelectedSnapId('')
    }
  }

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>輸入目前持倉</CardHeader>
        <CardContent>
          {isSignedIn && snapshots.length > 0 && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b">
              <label className="text-sm font-medium text-gray-700">載入儲存方案</label>
              <select
                value={selectedSnapId}
                onChange={(e) => handleLoad(e.target.value)}
                className="rounded border px-3 py-1 text-sm"
              >
                <option value="">-- 選擇方案 --</option>
                {snapshots.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {selectedSnapId && (
                <button
                  onClick={() => handleDelete(selectedSnapId)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  刪除
                </button>
              )}
            </div>
          )}

          <HoldingForm values={holdings} onChange={setHoldings} reference={reference ?? undefined} totalAmount={totalAmount} onTotalAmountChange={setTotalAmount} />
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
            {isSignedIn && (
              <>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="方案名稱"
                  className="rounded border px-3 py-1 text-sm w-40"
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  儲存方案
                </button>
              </>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '計算中…' : '產生轉換建議'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
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
