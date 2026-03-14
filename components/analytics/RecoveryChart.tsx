'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function RecoveryChart({ data }: { data: Array<{ date: string; rate: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={240}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11 }} 
          angle={-45}
          textAnchor="end"
          height={60}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ fontSize: 11 }} 
          unit="%" 
          domain={[0, 100]} 
          width={40}
        />
        <Tooltip 
          formatter={(v: number) => [`${v.toFixed(1)}%`, 'Recovery Rate']}
          labelStyle={{ fontSize: '12px' }}
          contentStyle={{ fontSize: '12px' }}
        />
        <Line 
          type="monotone" 
          dataKey="rate" 
          stroke="#6366f1" 
          strokeWidth={2} 
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
