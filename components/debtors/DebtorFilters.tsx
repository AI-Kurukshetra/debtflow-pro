'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'current', label: 'Current' },
  { value: 'overdue_30', label: '30+ Days' },
  { value: 'overdue_60', label: '60+ Days' },
  { value: 'overdue_90', label: '90+ Days' },
  { value: 'in_payment_plan', label: 'Payment Plan' },
  { value: 'settled', label: 'Settled' },
]

export function DebtorFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const status = params.get('status') ?? 'all'
  const search = params.get('search') ?? ''

  function update(nextStatus: string, nextSearch: string) {
    const next = new URLSearchParams()
    if (nextStatus && nextStatus !== 'all') next.set('status', nextStatus)
    if (nextSearch) next.set('search', nextSearch)
    const qs = next.toString()
    router.push(`/debtors${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Select value={status} onChange={(e) => update(e.target.value, search)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Search by debtor name"
          value={search}
          onChange={(e) => update(status, e.target.value)}
        />
      </div>
      <Button variant="outline" onClick={() => update('all', '')}>
        Reset filters
      </Button>
    </div>
  )
}
