import { cn } from '@/lib/cn'

const STATUS_CONFIG = {
  current: { label: 'Current', cls: 'bg-green-100 text-green-800' },
  overdue_30: { label: '30+ Days', cls: 'bg-yellow-100 text-yellow-800' },
  overdue_60: { label: '60+ Days', cls: 'bg-orange-100 text-orange-800' },
  overdue_90: { label: '90+ Days', cls: 'bg-red-100 text-red-800' },
  in_payment_plan: { label: 'Payment Plan', cls: 'bg-blue-100 text-blue-800' },
  settled: { label: 'Settled', cls: 'bg-blue-100 text-blue-800' },
  written_off: { label: 'Written Off', cls: 'bg-gray-100 text-gray-800' },
} as const

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status.replace('_', ' '),
    cls: 'bg-gray-100 text-gray-800',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
      config.cls
    )}>
      {config.label}
    </span>
  )
}
