import { notFound } from 'next/navigation'
import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { DebtorDetail } from '@/components/debtors/DebtorDetail'
import type { Tables } from '@/lib/types'

export default async function DebtorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { orgId, role } = user ? await ensureUserOrg(user) : { orgId: null, role: null }

  if (!orgId) return notFound()

  const { data: debtorData, error } = await supabase
    .from('debtors')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()
  const debtor = debtorData as Tables<'debtors'> | null

  if (error || !debtor) return notFound()

  const { data: accountData } = await supabase
    .from('accounts')
    .select('*')
    .eq('debtor_id', debtor.id)
    .eq('org_id', orgId)
  const accounts = (accountData ?? []) as Tables<'accounts'>[]
  const { data: paymentData } = await supabase
    .from('payments')
    .select('*')
    .eq('debtor_id', debtor.id)
    .eq('org_id', orgId)
    .order('payment_date', { ascending: false })
  const payments = (paymentData ?? []) as Tables<'payments'>[]
  const { data: communicationData } = await supabase
    .from('communications')
    .select('*')
    .eq('debtor_id', debtor.id)
    .eq('org_id', orgId)
    .order('sent_at', { ascending: false })
  const communications = (communicationData ?? []) as Tables<'communications'>[]
  const { data: planData } = await supabase
    .from('payment_plans')
    .select('*')
    .eq('debtor_id', debtor.id)
    .eq('org_id', orgId)
  const plans = (planData ?? []) as Tables<'payment_plans'>[]
  const paymentPlan = plans?.[0] ?? null
  const { data: installmentData } = paymentPlan
    ? await supabase
        .from('payment_installments')
        .select('*')
        .eq('plan_id', paymentPlan.id)
        .order('due_date', { ascending: true })
    : { data: [] }
  const installments = (installmentData ?? []) as Tables<'payment_installments'>[]
  const { data: auditData } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', debtor.org_id)
    .order('created_at', { ascending: false })
    .limit(30)
  const auditLogs = ((auditData ?? []) as Tables<'audit_logs'>[]).filter((log) => {
    if (log.entity_id === debtor.id) return true
    if (!log.metadata || typeof log.metadata !== 'object' || Array.isArray(log.metadata)) return false

    return log.metadata.debtor_id === debtor.id
  })

  return (
    <DebtorDetail
      debtor={debtor}
      accounts={accounts}
      payments={payments}
      communications={communications}
      paymentPlan={paymentPlan}
      installments={installments}
      auditLogs={auditLogs}
      canManage={role !== 'viewer'}
    />
  )
}
