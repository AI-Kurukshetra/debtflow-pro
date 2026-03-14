import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function PaymentsPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { orgId } = user ? await ensureUserOrg(user) : { orgId: null }

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">Track repayment activity across all debtors.</p>
        </div>

        <Card>
          <CardContent className="p-6 text-sm text-red-600">Organization not found for this user.</CardContent>
        </Card>
      </div>
    )
  }

  const { data: payments, error } = await supabase
    .from('payments')
    .select('id, amount, payment_date, method, status, debtor_id')
    .eq('org_id', orgId)
    .order('payment_date', { ascending: false })

  const debtorIds = Array.from(new Set((payments ?? []).map((p) => p.debtor_id)))
  const { data: debtors } = debtorIds.length
    ? await supabase.from('debtors').select('id, full_name, reference_number').in('id', debtorIds)
    : { data: [] }
  const debtorMap = new Map((debtors ?? []).map((d) => [d.id, d]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Track repayment activity across all debtors.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-red-600">Failed to load payments.</div>
          ) : payments && payments.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No payments recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debtor</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-gray-900">
                      {debtorMap.get(payment.debtor_id)?.full_name ?? '-'}
                    </TableCell>
                    <TableCell>{debtorMap.get(payment.debtor_id)?.reference_number ?? '-'}</TableCell>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="capitalize">{payment.method.replace('_', ' ')}</TableCell>
                    <TableCell className="capitalize">{payment.status}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(payment.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
