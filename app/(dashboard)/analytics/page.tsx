import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { RecoveryChart } from '@/components/analytics/RecoveryChart'
import { StatusBreakdown } from '@/components/analytics/StatusBreakdown'
import { formatCurrency } from '@/lib/utils'
import type { Tables } from '@/lib/types'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-sm mt-1 text-gray-500">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { orgId } = user ? await ensureUserOrg(user) : { orgId: null }

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Recovery metrics and portfolio health.</p>
        </div>

        <Card>
          <CardContent className="p-6 text-sm text-red-600">Organization not found for this user.</CardContent>
        </Card>
      </div>
    )
  }

  const { data: debtorData } = await supabase
    .from('debtors')
    .select('status, outstanding_amount')
    .eq('org_id', orgId)
  const debtors = (debtorData ?? []) as Pick<Tables<'debtors'>, 'status' | 'outstanding_amount'>[]
  const { data: paymentData } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .eq('org_id', orgId)
    .order('payment_date', { ascending: true })
  const payments = (paymentData ?? []) as Pick<Tables<'payments'>, 'amount' | 'payment_date'>[]
  const { data: planData } = await supabase
    .from('payment_plans')
    .select('installments_paid, installments_total')
    .eq('org_id', orgId)
  const plans = (planData ?? []) as Pick<
    Tables<'payment_plans'>,
    'installments_paid' | 'installments_total'
  >[]
  const { data: communicationData } = await supabase
    .from('communications')
    .select('status, sent_at')
    .eq('org_id', orgId)
  const communications = (communicationData ?? []) as Pick<
    Tables<'communications'>,
    'status' | 'sent_at'
  >[]

  const totalOutstanding = debtors.reduce((sum, debtor) => sum + Number(debtor.outstanding_amount), 0)
  const totalRecovered = payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const recoveryRate = totalOutstanding > 0 ? (totalRecovered / (totalRecovered + totalOutstanding)) * 100 : 0
  const planCompletionRate = plans.length
    ? (plans.reduce((sum, plan) => sum + plan.installments_paid / Math.max(plan.installments_total, 1), 0) /
        plans.length) *
      100
    : 0
  const responseCount = communications.filter((row) => row.status === 'responded').length
  const contactResponseRate = communications.length ? (responseCount / communications.length) * 100 : 0

  const statusCounts: Record<string, number> = {}
  for (const debtor of debtors) {
    statusCounts[debtor.status] = (statusCounts[debtor.status] ?? 0) + 1
  }
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const paymentTotals = new Map<string, number>()
  for (const payment of payments) {
    const key = payment.payment_date
    paymentTotals.set(key, (paymentTotals.get(key) ?? 0) + Number(payment.amount))
  }

  const chartDates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    return date
  })

  let cumulativeRecovered = 0
  const chartData = chartDates.map((date) => {
    const isoDate = date.toISOString().split('T')[0]
    cumulativeRecovered += paymentTotals.get(isoDate) ?? 0
    const dailyRate =
      totalRecovered > 0 ? Math.min(100, (cumulativeRecovered / Math.max(totalRecovered, 1)) * 100) : 0

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rate: Number(dailyRate.toFixed(1)),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Recovery metrics and portfolio health.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total Outstanding" value={formatCurrency(totalOutstanding)} />
        <StatCard label="Total Recovered" value={formatCurrency(totalRecovered)} />
        <StatCard label="Recovery Rate" value={`${recoveryRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Payment Plan Completion" value={`${planCompletionRate.toFixed(1)}%`} />
        <StatCard label="Contact Response Rate" value={`${contactResponseRate.toFixed(1)}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Recovered payments over the last 30 days</h2>
            <RecoveryChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Status breakdown</h2>
            <div className="flex justify-center">
              <StatusBreakdown data={statusData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
