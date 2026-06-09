import { useAuthStore } from '../store/authStore'

const _base = import.meta.env.VITE_API_URL || ''
export const BASE = _base.replace(/\/+$/, '') + '/api'

export interface AssetAllocation {
  taiwan_etf: number
  us_etf: number
  short_treasury: number
  long_treasury: number
  short_corp: number
  long_corp: number
  gold: number
  oil: number
  cash: number
}

export interface TargetAllocation {
  total_score: number
  target: AssetAllocation
}

export interface CurrentHoldings {
  taiwan_etf: number
  us_etf: number
  short_treasury: number
  long_treasury: number
  short_corp: number
  long_corp: number
  gold: number
  oil: number
  cash: number
}

export interface DailyReportType {
  id: string
  date: string
  news_score: number
  cape_score: number
  yield_curve_score: number
  vix_score: number
  total_score: number
  target_allocation: Record<string, number>
  headline: string | null
  key_concerns: string[] | null
  key_positives: string[] | null
  gemini_limited: boolean
  created_at: string
}

export interface AdjustmentStep {
  month: number
  action: string
}

export interface TransitionSuggestion {
  current: CurrentHoldings
  target: AssetAllocation
  steps: AdjustmentStep[]
  total_months: number
  speed: string
}

async function getToken(): Promise<string | null> {
  return useAuthStore.getState().token
}

async function _fetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers })
}

export async function fetchAllocation(): Promise<TargetAllocation> {
  const res = await _fetch(`${BASE}/allocation`)
  if (!res.ok) throw new Error('無法取得目標配置')
  return res.json()
}

export async function fetchTransition(
  current: CurrentHoldings,
  speed: string = 'standard'
): Promise<TransitionSuggestion> {
  const res = await _fetch(`${BASE}/suggestion/transition?speed=${speed}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(current),
  })
  if (!res.ok) throw new Error('無法取得轉換建議')
  return res.json()
}
