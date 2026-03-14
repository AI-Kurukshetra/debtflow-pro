import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, logAuditEvent } from '@/lib/supabase/server'
import type { PortalAccountSummary, PortalPaymentRequest, PortalPaymentResponse, Tables } from '@/lib/types'

type PortalDebtorPaymentMatch = Pick<
  Tables<'debtors'>,
  'id' | 'org_id' | 'outstanding_amount' | 'status' | 'email' | 'reference_number' | 'created_at' | 'updated_at'
>

function normalizePortalPayment(input: PortalPaymentRequest) {
  return {
    email: input.email.trim().toLowerCase(),
    reference_number: input.reference_number.trim().toUpperCase(),
    amount: Number(input.amount),
  }
}

function pickPreferredPortalDebtor(matches: PortalDebtorPaymentMatch[]) {
  if (matches.length === 0) {
    return null
  }

  return [...matches].sort((left, right) => {
    const leftOutstanding = Number(left.outstanding_amount)
    const rightOutstanding = Number(right.outstanding_amount)

    if ((leftOutstanding > 0) !== (rightOutstanding > 0)) {
      return rightOutstanding > 0 ? 1 : -1
    }

    if ((left.status === 'settled') !== (right.status === 'settled')) {
      return left.status === 'settled' ? 1 : -1
    }

    if (leftOutstanding !== rightOutstanding) {
      return rightOutstanding - leftOutstanding
    }

    return new Date(right.updated_at ?? right.created_at ?? 0).getTime() - new Date(left.updated_at ?? left.created_at ?? 0).getTime()
  })[0]
}

async function findPortalDebtorForPayment(email: string, referenceNumber: string) {
  const supabase = createServiceRoleClient()
  if (!supabase) {
    return null
  }

  const { data: exactMatches, error } = await supabase
    .from('debtors')
    .select('id, org_id, outstanding_amount, status, email, reference_number, created_at, updated_at')
    .ilike('email', email)
    .eq('reference_number', referenceNumber)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error || !exactMatches || exactMatches.length === 0) {
    return null
  }

  const preferredDebtor = pickPreferredPortalDebtor(exactMatches as PortalDebtorPaymentMatch[])
  if (!preferredDebtor) {
    return null
  }

  return {
    id: preferredDebtor.id,
    org_id: preferredDebtor.org_id,
    outstanding_amount: preferredDebtor.outstanding_amount,
    status: preferredDebtor.status,
    email: preferredDebtor.email,
    reference_number: preferredDebtor.reference_number,
  }
}

async function syncPaymentPlanAfterPortalPayment(
  debtorId: string,
  orgId: string,
  paymentAmount: number
): Promise<PortalAccountSummary['plan']> {
  const supabase = createServiceRoleClient()
  if (!supabase) {
    return null
  }

  const { data: plan } = await supabase
    .from('payment_plans')
    .select('id, installments_paid, installments_total, status')
    .eq('debtor_id', debtorId)
    .eq('org_id', orgId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) {
    return null
  }

  const { data: installmentRows } = await supabase
    .from('payment_installments')
    .select('id, due_date, amount, status, paid_at')
    .eq('plan_id', plan.id)
    .order('due_date', { ascending: true })

  const installments = installmentRows ?? []
  let remainingAmount = paymentAmount
  const now = new Date().toISOString()

  const installmentsToMarkPaid = installments
    .filter((installment) => installment.status !== 'paid')
    .filter((installment) => {
      const installmentAmount = Number(installment.amount)
      if (remainingAmount + 0.0001 < installmentAmount) {
        return false
      }

      remainingAmount -= installmentAmount
      return true
    })

  if (installmentsToMarkPaid.length > 0) {
    await supabase
      .from('payment_installments')
      .update({
        status: 'paid',
        paid_at: now,
      })
      .in(
        'id',
        installmentsToMarkPaid.map((installment) => installment.id)
      )
  }

  const refreshedInstallments =
    installmentsToMarkPaid.length > 0
      ? installments.map((installment) =>
          installmentsToMarkPaid.some((paidInstallment) => paidInstallment.id === installment.id)
            ? { ...installment, status: 'paid' as const, paid_at: now }
            : installment
        )
      : installments

  const paidInstallments = refreshedInstallments.filter((installment) => installment.status === 'paid').length
  const nextPlanStatus: Tables<'payment_plans'>['status'] =
    paidInstallments >= plan.installments_total ? 'completed' : plan.status

  if (
    paidInstallments !== plan.installments_paid ||
    nextPlanStatus !== plan.status
  ) {
    await supabase
      .from('payment_plans')
      .update({
        installments_paid: paidInstallments,
        status: nextPlanStatus,
      })
      .eq('id', plan.id)
  }

  return {
    id: plan.id,
    installments_paid: paidInstallments,
    installments_total: plan.installments_total,
    status: nextPlanStatus,
    installments: refreshedInstallments,
  }
}

export async function POST(req: NextRequest) {
  const { email, reference_number, amount } = normalizePortalPayment((await req.json()) as PortalPaymentRequest)
  const paymentAmount = amount

  if (!email || !reference_number || !paymentAmount) {
    return NextResponse.json({ error: 'email, reference_number, and amount are required' }, { status: 400 })
  }

  if (paymentAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid payment amount.' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const debtor = await findPortalDebtorForPayment(email, reference_number)

  if (!debtor) {
    return NextResponse.json({ error: 'No account found. Check your email and reference number.' }, { status: 404 })
  }

  const outstandingAmount = Number(debtor.outstanding_amount)
  if (paymentAmount > outstandingAmount) {
    return NextResponse.json({ error: 'Payment amount cannot exceed the outstanding balance.' }, { status: 400 })
  }

  const nextOutstandingAmount = Math.max(0, outstandingAmount - paymentAmount)
  const nextStatus: Tables<'debtors'>['status'] = nextOutstandingAmount === 0 ? 'settled' : debtor.status

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      debtor_id: debtor.id,
      org_id: debtor.org_id,
      amount: paymentAmount,
      method: 'portal',
      status: 'completed',
      notes: 'Portal payment',
    })
    .select('id')
    .single()

  if (paymentError || !payment) {
    return NextResponse.json({ error: paymentError?.message ?? 'Failed to create payment.' }, { status: 500 })
  }

  const { error: debtorError } = await supabase
    .from('debtors')
    .update({
      outstanding_amount: nextOutstandingAmount,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debtor.id)

  if (debtorError) {
    return NextResponse.json({ error: debtorError.message }, { status: 500 })
  }

  const updatedPlan = await syncPaymentPlanAfterPortalPayment(debtor.id, debtor.org_id, paymentAmount)

  await logAuditEvent(supabase, {
    orgId: debtor.org_id,
    action: 'portal_payment_created',
    entityType: 'payment',
    entityId: payment.id,
    metadata: {
      debtor_id: debtor.id,
      amount: paymentAmount,
      outstanding_amount: nextOutstandingAmount,
    },
  })

  const result: PortalPaymentResponse = {
    payment_id: payment.id,
    outstanding_amount: nextOutstandingAmount,
    status: nextStatus,
    plan: updatedPlan,
  }

  return NextResponse.json(result)
}
