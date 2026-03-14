'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const RecoveryChart = dynamic(
  () => import('@/components/analytics/RecoveryChart').then((mod) => ({ default: mod.RecoveryChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[240px] w-full" />,
  }
)

const StatusBreakdown = dynamic(
  () => import('@/components/analytics/StatusBreakdown').then((mod) => ({ default: mod.StatusBreakdown })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full" />,
  }
)

interface RecoveryChartWrapperProps {
  data: Array<{ date: string; rate: number }>
}

export function RecoveryChartWrapper({ data }: RecoveryChartWrapperProps) {
  return <RecoveryChart data={data} />
}

interface StatusBreakdownWrapperProps {
  data: Array<{ name: string; value: number }>
}

export function StatusBreakdownWrapper({ data }: StatusBreakdownWrapperProps) {
  return <StatusBreakdown data={data} />
}
