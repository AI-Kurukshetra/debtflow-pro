'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/debtors/StatusBadge'

type CampaignRecipient = {
  id: string
  debtor_id: string
  status: 'sent' | 'delivered' | 'responded' | 'failed'
  full_name: string
  reference_number: string
  debtor_status: string
}

export function CampaignRecipientTable({
  campaignId,
  rows,
  canManage,
}: {
  campaignId: string
  rows: CampaignRecipient[]
  canManage: boolean
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function logResponse(debtorId: string) {
    if (!canManage) return

    setLoadingId(debtorId)
    setError(null)

    const response = await fetch('/api/campaigns/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        debtor_id: debtorId,
      }),
    })
    const result = await response.json()
    setLoadingId(null)

    if (!response.ok) {
      setError(result.error ?? 'Unable to log response.')
      return
    }

    router.refresh()
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-500">No debtors in this campaign yet.</p>
  }

  return (
    <div className="space-y-3">
      {error && <p className="px-4 pt-4 text-sm text-red-600">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Debtor</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Send status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-gray-900">{row.full_name}</TableCell>
              <TableCell>{row.reference_number}</TableCell>
              <TableCell>
                <StatusBadge status={row.debtor_status} />
              </TableCell>
              <TableCell className="capitalize">{row.status}</TableCell>
              <TableCell className="text-right">
                {row.status !== 'responded' && canManage ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => logResponse(row.debtor_id)}
                    disabled={loadingId === row.debtor_id}
                  >
                    {loadingId === row.debtor_id ? 'Saving...' : 'Log Response'}
                  </Button>
                ) : row.status === 'responded' ? (
                  <span className="text-xs font-medium text-green-600">Logged</span>
                ) : (
                  <span className="text-xs text-gray-400">View only</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
