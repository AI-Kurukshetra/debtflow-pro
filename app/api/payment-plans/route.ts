import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, ensureUserOrg, logAuditEvent } from '@/lib/supabase/server'
import type { PaymentPlanCreateRequest, TableInsert, Tables } from '@/lib/types'

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + weeks * 7)
  return next
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PaymentPlanCreateRequest
  const totalAmount = Number(body.total_amount)
  const installmentAmount = Number(body.installment_amount)
  const installmentsTotal = Number(body.installments_total)

  if (!body.debtor_id || !body.start_date || !totalAmount || !installmentAmount || !installmentsTotal) {
    return NextResponse.json({ error: 'All payment plan fields are required.' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orgId } = await ensureUserOrg(user)
  if (!orgId) {
    return NextResponse.json({ error: 'Organization not found for this user.' }, { status: 400 })
  }

  const { data: debtor } = await supabase
    .from('debtors')
    .select('id, org_id')
    .eq('id', body.debtor_id)
    .eq('org_id', orgId)
    .single()

  if (!debtor) {
    return NextResponse.json({ error: 'Debtor not found.' }, { status: 404 })
  }

  const { data: plan, error: planError } = await supabase
    .from('payment_plans')
    .insert({
      debtor_id: debtor.id,
      org_id: orgId,
      total_amount: totalAmount,
      installment_amount: installmentAmount,
      frequency: body.frequency,
      start_date: body.start_date,
      installments_total: installmentsTotal,
      installments_paid: 0,
      status: 'active',
    })
    .select('id')
    .single()

  if (planError || !plan) {
    return NextResponse.json({ error: planError?.message ?? 'Failed to create payment plan.' }, { status: 400 })
  }

  const baseDate = new Date(body.start_date)
  const installments: TableInsert<'payment_installments'>[] = Array.from(
    { length: installmentsTotal },
    (_, index) => {
      const dueDate = body.frequency === 'monthly' ? addMonths(baseDate, index) : addWeeks(baseDate, index)

      return {
        plan_id: plan.id,
        due_date: dueDate.toISOString().split('T')[0],
        amount: installmentAmount,
        status: 'upcoming',
      }
    }
  )

  const { error: installmentsError } = await supabase.from('payment_installments').insert(installments)
  if (installmentsError) {
    return NextResponse.json({ error: installmentsError.message }, { status: 400 })
  }

  const debtorUpdate: Partial<Tables<'debtors'>> = {
    status: 'in_payment_plan',
    updated_at: new Date().toISOString(),
  }
  const { error: debtorError } = await supabase
    .from('debtors')
    .update(debtorUpdate)
    .eq('id', debtor.id)

  if (debtorError) {
    return NextResponse.json({ error: debtorError.message }, { status: 400 })
  }

  await logAuditEvent(supabase, {
    orgId,
    userId: user.id,
    action: 'payment_plan_created',
    entityType: 'payment_plan',
    entityId: plan.id,
    metadata: {
      debtor_id: debtor.id,
      total_amount: totalAmount,
      installment_amount: installmentAmount,
      frequency: body.frequency,
      installments_total: installmentsTotal,
    },
  })

  return NextResponse.json({ id: plan.id })
}
