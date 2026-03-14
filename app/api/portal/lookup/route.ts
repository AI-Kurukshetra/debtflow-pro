import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { PortalAccountSummary, PortalLookupRequest, Tables } from '@/lib/types'

type PortalDebtorMatch = Pick<
  Tables<'debtors'>,
  'id' | 'org_id' | 'full_name' | 'email' | 'reference_number' | 'outstanding_amount' | 'status' | 'created_at' | 'updated_at'
>

function normalizePortalLookup(input: PortalLookupRequest) {
  return {
    email: input.email.trim().toLowerCase(),
    reference_number: input.reference_number.trim().toUpperCase(),
  }
}

function pickPreferredPortalDebtor(matches: PortalDebtorMatch[]) {
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

async function findPortalDebtor(
  email: string,
  referenceNumber: string
): Promise<Pick<
  Tables<'debtors'>,
  'id' | 'org_id' | 'full_name' | 'email' | 'reference_number' | 'outstanding_amount' | 'status'
> | null> {
  const supabase = createServiceRoleClient()
  if (!supabase) {
    return null
  }

  const { data: exactMatches, error } = await supabase
    .from('debtors')
    .select('id, org_id, full_name, email, reference_number, outstanding_amount, status, created_at, updated_at')
    .ilike('email', email)
    .eq('reference_number', referenceNumber)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error || !exactMatches || exactMatches.length === 0) {
    return null
  }

  const preferredDebtor = pickPreferredPortalDebtor(exactMatches as PortalDebtorMatch[])
  if (!preferredDebtor) {
    return null
  }

  return {
    id: preferredDebtor.id,
    org_id: preferredDebtor.org_id,
    full_name: preferredDebtor.full_name,
    email: preferredDebtor.email,
    reference_number: preferredDebtor.reference_number,
    outstanding_amount: preferredDebtor.outstanding_amount,
    status: preferredDebtor.status,
  }
}

export async function POST(req: NextRequest) {
  const payload = normalizePortalLookup((await req.json()) as PortalLookupRequest)
  const { email, reference_number } = payload

  if (!email || !reference_number) {
    return NextResponse.json({ error: 'email and reference_number are required' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const debtor = await findPortalDebtor(email, reference_number)

  if (!debtor) {
    return NextResponse.json({ error: 'No account found. Check your email and reference number.' }, { status: 404 })
  }

  const { data: plan } = await supabase
    .from('payment_plans')
    .select('id, installments_paid, installments_total, status')
    .eq('debtor_id', debtor.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: installments } = plan
    ? await supabase
        .from('payment_installments')
        .select('id, due_date, amount, status, paid_at')
        .eq('plan_id', plan.id)
        .order('due_date', { ascending: true })
    : { data: [] }

  const { data: paymentData } = await supabase
    .from('payments')
    .select('id, amount, payment_date, method, status, created_at')
    .eq('debtor_id', debtor.id)
    .order('payment_date', { ascending: false })
    .limit(8)

  const result: PortalAccountSummary = {
    debtor,
    plan: plan
      ? {
          ...plan,
          installments: installments ?? [],
        }
      : null,
    payments: paymentData ?? [],
  }

  return NextResponse.json(result)
}
