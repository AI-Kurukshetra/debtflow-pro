'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/debtors/StatusBadge'
import { RiskScoreBadge } from '@/components/debtors/RiskScoreBadge'
import { AIInsightCard } from '@/components/debtors/AIInsightCard'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Tables } from '@/lib/types'
import { PaymentPlanForm } from '@/components/debtors/PaymentPlanForm'

export function DebtorDetail({
  debtor,
  accounts,
  payments,
  communications,
  paymentPlan,
  installments,
  auditLogs,
  canManage,
}: {
  debtor: Tables<'debtors'>
  accounts: Tables<'accounts'>[]
  payments: Tables<'payments'>[]
  communications: Tables<'communications'>[]
  paymentPlan: Tables<'payment_plans'> | null
  installments: Tables<'payment_installments'>[]
  auditLogs: Tables<'audit_logs'>[]
  canManage: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [responseLoadingId, setResponseLoadingId] = useState<string | null>(null)
  const [responseError, setResponseError] = useState<string | null>(null)
  const lastContactAt = communications[0]?.sent_at ?? null

  async function logResponse(communicationId: string, campaignId: string) {
    if (!canManage) return

    setResponseLoadingId(communicationId)
    setResponseError(null)

    const response = await fetch('/api/campaigns/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        debtor_id: debtor.id,
        communication_id: communicationId,
      }),
    })
    const result = await response.json()

    setResponseLoadingId(null)
    if (!response.ok) {
      setResponseError(result.error ?? 'Unable to log response.')
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{debtor.full_name}</h1>
            <p className="text-sm text-gray-500 mt-1">{debtor.reference_number}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={debtor.status} />
            {debtor.risk_label && debtor.risk_score !== null && (
              <RiskScoreBadge score={debtor.risk_score} label={debtor.risk_label} size="lg" />
            )}
          </div>
        </div>

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setTab('plan')}>Create Payment Plan</Button>
            <Button variant="outline" size="sm" onClick={() => setTab('communications')}>Log Contact</Button>
            <Button variant="outline" size="sm" onClick={() => setTab('overview')}>Re-analyze</Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Viewer access is read-only for payment plans, contacts, and scoring actions.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">Total owed</div>
            <div className="text-lg font-semibold">{formatCurrency(Number(debtor.total_owed))}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">Outstanding</div>
            <div className="text-lg font-semibold">{formatCurrency(Number(debtor.outstanding_amount))}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">Days overdue</div>
            <div className="text-lg font-semibold">{debtor.days_overdue}</div>
          </div>
          <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">Last contact</div>
            <div className="text-sm font-semibold">{lastContactAt ? formatDateTime(lastContactAt) : 'No contact yet'}</div>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="plan">Payment Plan</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <AIInsightCard debtor={debtor} onRefresh={() => router.refresh()} canManage={canManage} />
          <Card>
            <CardHeader>
              <CardTitle>Account details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{account.loan_type}</div>
                    <div className="text-xs text-gray-500">Opened {account.opened_at ? formatDate(account.opened_at) : '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(Number(account.outstanding_amount))}</div>
                    <div className="text-xs text-gray-500">Original {formatCurrency(Number(account.original_amount))}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-sm text-gray-500">No payments recorded yet.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{formatCurrency(Number(p.amount))}</div>
                      <div className="text-xs text-gray-500">{formatDate(p.payment_date)}</div>
                    </div>
                    <div className="text-xs text-gray-500">{p.method}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardHeader>
              <CardTitle>Communication timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {responseError && <p className="text-sm text-red-600">{responseError}</p>}
              {communications.length === 0 ? (
                <p className="text-sm text-gray-500">No communications yet.</p>
              ) : (
                communications.map((c) => (
                  <div key={c.id} className="rounded-md border border-gray-100 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-gray-900">{c.channel.toUpperCase()} - {c.status}</div>
                      {canManage && c.direction === 'outbound' && c.status !== 'responded' && c.campaign_id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => logResponse(c.id, c.campaign_id!)}
                          disabled={responseLoadingId === c.id}
                        >
                          {responseLoadingId === c.id ? 'Saving...' : 'Log Response'}
                        </Button>
                      ) : null}
                    </div>
                    <div className="text-xs text-gray-500">{c.sent_at ? formatDate(c.sent_at) : '-'}</div>
                    {c.message && <p className="text-xs text-gray-500 mt-1">{c.message}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installment tracker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentPlan ? (
                <>
                  <div className="text-sm text-gray-500">
                    {paymentPlan.installments_paid} of {paymentPlan.installments_total} installments paid
                  </div>
                  <div className="space-y-2">
                    {installments.map((i) => (
                      <div key={i.id} className="flex items-center justify-between text-sm">
                        <div>{formatDate(i.due_date)}</div>
                        <div>{formatCurrency(Number(i.amount))}</div>
                        <div className="text-xs text-gray-500">{i.status}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">No payment plan yet.</p>
                  {canManage ? (
                    <PaymentPlanForm debtorId={debtor.id} orgId={debtor.org_id} onComplete={() => router.refresh()} />
                  ) : (
                    <p className="text-sm text-gray-400">Only collectors and admins can create a payment plan.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No audit activity recorded for this debtor yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="rounded-md border border-gray-100 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-gray-900">{log.action.replaceAll('_', ' ')}</div>
                      <div className="text-xs text-gray-500">{log.created_at ? formatDateTime(log.created_at) : '-'}</div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{log.entity_type.replaceAll('_', ' ')}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
