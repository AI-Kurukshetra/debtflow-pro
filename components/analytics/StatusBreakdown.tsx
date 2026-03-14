'use client'

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS: Record<string, string> = {
  current: '#9ca3af',
  overdue_30: '#fbbf24',
  overdue_60: '#f97316',
  overdue_90: '#ef4444',
  in_payment_plan: '#3b82f6',
  settled: '#22c55e',
}

export function StatusBreakdown({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={280}>
      <PieChart margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
        <Pie 
          data={data} 
          cx="50%" 
          cy="40%" 
          innerRadius={55} 
          outerRadius={85} 
          dataKey="value" 
          paddingAngle={2}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] ?? '#94a3b8'} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v} debtors`, 'Count']} />
        <Legend 
          verticalAlign="bottom" 
          height={50}
          iconType="circle"
          wrapperStyle={{ fontSize: '11px' }}
          formatter={(value) => value.replace('_', ' ')}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
