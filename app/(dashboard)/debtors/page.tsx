import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { DebtorFilters } from '@/components/debtors/DebtorFilters'
import { DebtorTable } from '@/components/debtors/DebtorTable'
import type { Tables } from '@/lib/types'

type DebtorStatusFilter = Tables<'debtors'>['status'] | 'all'

export default async function DebtorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>
}) {
  const params = await searchParams
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { orgId } = user ? await ensureUserOrg(user) : { orgId: null }
  const status = (params.status as DebtorStatusFilter | undefined) ?? 'all'
  const search = params.search

  if (!orgId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Debtors</h1>
            <p className="mt-1 text-sm text-gray-500">Manage accounts and recovery status.</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 text-sm text-red-600">Organization not found for this user.</CardContent>
        </Card>
      </div>
    )
  }

  let query = supabase
    .from('debtors')
    .select('id, full_name, reference_number, outstanding_amount, days_overdue, status, risk_score, risk_label')
    .eq('org_id', orgId)
    .order('days_overdue', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)
  if (search) query = query.ilike('full_name', `%${search}%`)

  const { data: debtorsData, error } = await query
  const debtors = (debtorsData ?? []) as Pick<
    Tables<'debtors'>,
    'id' | 'full_name' | 'reference_number' | 'outstanding_amount' | 'days_overdue' | 'status' | 'risk_score' | 'risk_label'
  >[]
  const debtorIds = debtors.map((debtor) => debtor.id)
  const { data: communicationData } = debtorIds.length
    ? await supabase
        .from('communications')
        .select('debtor_id, sent_at')
        .eq('org_id', orgId)
        .in('debtor_id', debtorIds)
        .order('sent_at', { ascending: false })
    : { data: [] }
  const communications = (communicationData ?? []) as Pick<Tables<'communications'>, 'debtor_id' | 'sent_at'>[]
  const lastContactByDebtor = new Map<string, string>()

  for (const communication of communications) {
    if (communication.sent_at && !lastContactByDebtor.has(communication.debtor_id)) {
      lastContactByDebtor.set(communication.debtor_id, communication.sent_at)
    }
  }

  const debtorsWithContact = debtors.map((debtor) => ({
    ...debtor,
    last_contact_at: lastContactByDebtor.get(debtor.id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Debtors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage accounts and recovery status.</p>
        </div>
      </div>

      <DebtorFilters />

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-red-600">Failed to load debtors.</div>
          ) : (
            <DebtorTable debtors={debtorsWithContact} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
