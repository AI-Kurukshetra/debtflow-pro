'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { PaymentPlanCreateRequest } from '@/lib/types'

export function PaymentPlanForm({ debtorId, orgId, onComplete }: { debtorId: string; orgId: string; onComplete: () => void }) {
  const [totalAmount, setTotalAmount] = useState('')
  const [installmentAmount, setInstallmentAmount] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly')
  const [startDate, setStartDate] = useState('')
  const [installmentsTotal, setInstallmentsTotal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const total = Number(totalAmount)
    const installment = Number(installmentAmount)
    const count = Number(installmentsTotal)

    if (!total || !installment || !count || !startDate) {
      setError('All fields are required.')
      return
    }

    setLoading(true)

    const payload: PaymentPlanCreateRequest = {
      debtor_id: debtorId,
      total_amount: total,
      installment_amount: installment,
      frequency,
      start_date: startDate,
      installments_total: count,
    }

    const response = await fetch('/api/payment-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    setLoading(false)

    if (!response.ok) {
      setError(result.error ?? 'Failed to create plan')
      return
    }

    onComplete()
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">Total amount</label>
          <Input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="12000" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Installment amount</label>
          <Input value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} placeholder="500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Frequency</label>
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Start date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500">Installments total</label>
          <Input value={installmentsTotal} onChange={(e) => setInstallmentsTotal(e.target.value)} placeholder="12" />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={loading} disabled={!orgId}>
        Create payment plan
      </Button>
    </form>
  )
}
