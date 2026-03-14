import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/debtors/StatusBadge'
import { formatCurrency, formatRelativeDate } from '@/lib/utils'
import type { Tables } from '@/lib/types'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        {sub ? <p className="mt-1 text-sm text-gray-500">{sub}</p> : null}
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { orgId } = user ? await ensureUserOrg(user) : { orgId: null }

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
            <p className="mt-1 text-sm text-gray-500">Recovery operations command center for today&apos;s follow-up work.</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-red-600">Organization not found for this user.</CardContent>
        </Card>
      </div>
    )
  }

  const { data: debtorData } = await supabase
    .from('debtors')
    .select('id, full_name, outstanding_amount, status')
    .eq('org_id', orgId)
  const debtors = (debtorData ?? []) as Pick<
    Tables<'debtors'>,
    'id' | 'full_name' | 'outstanding_amount' | 'status'
  >[]

  const { data: paymentData } = await supabase
    .from('payments')
    .select('id, amount, payment_date, debtor_id')
    .eq('org_id', orgId)
    .order('payment_date', { ascending: false })
    .limit(5)
  const payments = (paymentData ?? []) as Pick<
    Tables<'payments'>,
    'id' | 'amount' | 'payment_date' | 'debtor_id'
  >[]

  const { data: campaignData } = await supabase
    .from('campaigns')
    .select('id, name, status, sent_count, response_count')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(4)
  const campaigns = (campaignData ?? []) as Pick<
    Tables<'campaigns'>,
    'id' | 'name' | 'status' | 'sent_count' | 'response_count'
  >[]

  const { data: communicationData } = await supabase
    .from('communications')
    .select('id, debtor_id, channel, status, sent_at')
    .eq('org_id', orgId)
    .order('sent_at', { ascending: false })
    .limit(6)
  const communications = (communicationData ?? []) as Pick<
    Tables<'communications'>,
    'id' | 'debtor_id' | 'channel' | 'status' | 'sent_at'
  >[]

  const debtorIds = Array.from(
    new Set([...payments.map((payment) => payment.debtor_id), ...communications.map((item) => item.debtor_id)])
  )
  const { data: debtorLookupData } = debtorIds.length
    ? await supabase.from('debtors').select('id, full_name').in('id', debtorIds)
    : { data: [] }
  const debtorLookup = new Map(
    ((debtorLookupData ?? []) as Pick<Tables<'debtors'>, 'id' | 'full_name'>[]).map((debtor) => [debtor.id, debtor])
  )

  const totalOutstanding = debtors.reduce((sum, debtor) => sum + Number(debtor.outstanding_amount), 0)
  const overdueCount = debtors.filter((debtor) => debtor.status.startsWith('overdue')).length
  const paymentPlanCount = debtors.filter((debtor) => debtor.status === 'in_payment_plan').length
  const responseRate =
    campaigns.reduce((sum, campaign) => sum + campaign.sent_count, 0) > 0
      ? (campaigns.reduce((sum, campaign) => sum + campaign.response_count, 0) /
          campaigns.reduce((sum, campaign) => sum + campaign.sent_count, 0)) *
        100
      : 0

  const statusSummary = [
    { label: '30+ Days', count: debtors.filter((debtor) => debtor.status === 'overdue_30').length, status: 'overdue_30' as const },
    { label: '60+ Days', count: debtors.filter((debtor) => debtor.status === 'overdue_60').length, status: 'overdue_60' as const },
    { label: '90+ Days', count: debtors.filter((debtor) => debtor.status === 'overdue_90').length, status: 'overdue_90' as const },
    { label: 'In Plan', count: paymentPlanCount, status: 'in_payment_plan' as const },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Recovery operations command center for today’s follow-up work.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Outstanding" value={formatCurrency(totalOutstanding)} sub="Across the active portfolio" />
        <StatCard label="Overdue Accounts" value={String(overdueCount)} sub="Require immediate outreach" />
        <StatCard label="Payment Plans" value={String(paymentPlanCount)} sub="Accounts under arrangement" />
        <StatCard label="Campaign Response Rate" value={`${responseRate.toFixed(1)}%`} sub="Based on recent campaigns" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>
              <p className="mt-1 text-sm text-gray-500">Payments and communications across the portfolio.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {payments.length === 0 && communications.length === 0 ? (
                <div className="p-6 text-sm text-gray-500">No recent activity yet.</div>
              ) : (
                <>
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          Payment received from {debtorLookup.get(payment.debtor_id)?.full_name ?? 'Unknown debtor'}
                        </div>
                        <div className="text-xs text-gray-500">{formatRelativeDate(payment.payment_date)}</div>
                      </div>
                      <div className="font-semibold text-green-700">{formatCurrency(Number(payment.amount))}</div>
                    </div>
                  ))}
                  {communications.map((communication) => (
                    <div key={communication.id} className="flex items-center justify-between px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {communication.channel.toUpperCase()} outreach to{' '}
                          {debtorLookup.get(communication.debtor_id)?.full_name ?? 'Unknown debtor'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {communication.sent_at ? formatRelativeDate(communication.sent_at) : 'Pending'}
                        </div>
                      </div>
                      <div className="capitalize text-gray-500">{communication.status}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900">Portfolio pressure</h2>
              <div className="mt-4 space-y-3">
                {statusSummary.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.status} />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900">Campaign snapshot</h2>
              <div className="mt-4 space-y-3">
                {campaigns.length === 0 ? (
                  <p className="text-sm text-gray-500">No campaigns created yet.</p>
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="rounded-md border border-gray-100 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                          {campaign.status}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {campaign.sent_count} sent · {campaign.response_count} responses
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
