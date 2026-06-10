import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AssetAllocation } from '../api/client'

const COLORS = [
  '#2563eb', '#3b82f6', '#10b981', '#34d399',
  '#f59e0b', '#fbbf24', '#ef4444', '#f87171', '#6b7280',
]

const LABELS: Record<string, string> = {
  taiwan_etf: '台股 ETF',
  us_etf: '美股 ETF',
  short_treasury: '短公債',
  long_treasury: '長公債',
  short_corp: '短公司債',
  long_corp: '長公司債',
  gold: '黃金',
  oil: '石油',
  cash: '現金',
}

export default function AllocationChart({ data, title }: { data: AssetAllocation; title?: string }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS] || key,
      value,
    }))

  return (
    <div>
      {title && <h3 className="text-center text-sm font-medium text-gray-500 mb-2">{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
