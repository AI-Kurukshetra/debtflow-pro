import { SupabaseClient } from '@supabase/supabase-js'
import { scoreDebtor } from '@/lib/scoring'
import type { Database, TableInsert, Tables } from '@/lib/types'

const FIRST_NAMES = ['James', 'Sarah', 'Michael', 'Emma', 'David', 'Priya', 'Carlos', 'Aisha', 'Tom', 'Linda', 'Raj', 'Maria', 'Kevin', 'Fatima', 'Daniel', 'Yuki']
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Patel', 'Garcia', 'Chen', 'Thompson', 'Ahmed', 'Wilson', 'Sharma', 'Nguyen', 'Okafor', 'Kim', 'Martinez']
const LOAN_TYPES = ['Personal Loan', 'Auto Loan', 'Credit Card', 'Business Loan', 'Home Equity Line']
const METHODS = ['bank_transfer', 'card', 'portal', 'cash'] as const

type SeedClient = SupabaseClient<Database>
type Method = (typeof METHODS)[number]
type OrgSpec = { name: string; slug: string; email: string }
type OrgSeedTarget = { orgId: string; orgName: string; slug: string }
type SeedOptions = {
  debtorCount: number
  paymentCount: number
  paymentPlanCount: number
  campaignCount: number
  campaignTargetCap: number
}

const FULL_SEED_OPTIONS: SeedOptions = {
  debtorCount: 80,
  paymentCount: 30,
  paymentPlanCount: 10,
  campaignCount: 5,
  campaignTargetCap: 30,
}

const STARTER_SEED_OPTIONS: SeedOptions = {
  debtorCount: 18,
  paymentCount: 8,
  paymentPlanCount: 4,
  campaignCount: 3,
  campaignTargetCap: 12,
}

const CAMPAIGN_SPECS = [
  {
    name: 'Q1 Overdue Reminder',
    status: 'completed',
    segment: 'overdue_30',
    channel: 'email',
    template:
      'Dear {{debtor_name}}, your balance of ${{amount}} is past due (ref {{reference}}). Please contact us to arrange payment.',
  },
  {
    name: 'High-Value Recovery',
    status: 'completed',
    segment: 'overdue_90',
    channel: 'sms',
    template: '[DebtFlow] URGENT: ${{amount}} outstanding on {{reference}}. Call 1-800-DEBTFLOW today.',
  },
  {
    name: 'March Settlement Offer',
    status: 'active',
    segment: 'overdue_60',
    channel: 'email',
    template:
      'Dear {{debtor_name}}, settle your ${{amount}} balance (ref: {{reference}}) at a reduced rate before month end.',
  },
  {
    name: 'Payment Plan Invite',
    status: 'draft',
    segment: 'all',
    channel: 'email',
    template:
      'Dear {{debtor_name}}, we can help you manage your ${{amount}} balance with a flexible monthly plan.',
  },
  {
    name: 'Final Notice',
    status: 'completed',
    segment: 'overdue_90',
    channel: 'sms',
    template: '[DebtFlow] Final notice: ${{amount}} on account {{reference}}. Legal action may follow without response.',
  },
] as const

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randAmount(min: number, max: number) {
  return Math.round(rand(min * 100, max * 100)) / 100
}

function shiftDate(base: Date, days: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function shiftMonth(base: Date, months: number): string {
  const d = new Date(base)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function pickStatus(i: number): Tables<'debtors'>['status'] {
  const buckets: Array<{ max: number; status: Tables<'debtors'>['status'] }> = [
    { max: 10, status: 'current' },
    { max: 25, status: 'overdue_30' },
    { max: 45, status: 'overdue_60' },
    { max: 60, status: 'overdue_90' },
    { max: 75, status: 'in_payment_plan' },
    { max: 85, status: 'settled' },
    { max: 100, status: 'written_off' },
  ]

  for (const bucket of buckets) {
    if (i < bucket.max) return bucket.status
  }

  return 'overdue_60'
}

function daysForStatus(status: Tables<'debtors'>['status']): number {
  switch (status) {
    case 'current':
      return 0
    case 'overdue_30':
      return rand(30, 59)
    case 'overdue_60':
      return rand(60, 89)
    case 'overdue_90':
      return rand(90, 200)
    case 'in_payment_plan':
      return rand(10, 120)
    default:
      return 0
  }
}

function getTargetedDebtors(
  debtors: Tables<'debtors'>[],
  segment: Tables<'campaigns'>['target_segment']
) {
  return debtors.filter((debtor) => {
    switch (segment) {
      case 'all':
        return true
      case 'overdue_30':
        return debtor.days_overdue >= 30
      case 'overdue_60':
        return debtor.days_overdue >= 60
      case 'overdue_90':
        return debtor.days_overdue >= 90
      case 'in_payment_plan':
        return debtor.status === 'in_payment_plan'
    }
  })
}

function buildDebtorRows(org: OrgSeedTarget, count: number): TableInsert<'debtors'>[] {
  const emailPrefix = org.slug.replace(/[^a-z0-9]/g, '')

  return Array.from({ length: count }, (_, i) => {
    const weightedIndex = Math.floor((i / Math.max(count, 1)) * 100)
    const status = pickStatus(weightedIndex)
    const daysOverdue = daysForStatus(status)
    const totalOwed = randAmount(500, 50000)
    const outstandingAmount = status === 'settled' ? 0 : randAmount(totalOwed * 0.3, totalOwed)
    const contactAttempts = rand(0, 12)
    const failedPayments = rand(0, 5)
    const score = scoreDebtor({
      days_overdue: daysOverdue,
      outstanding_amount: outstandingAmount,
      contact_attempts: contactAttempts,
      failed_payments: failedPayments,
      total_owed: totalOwed,
    })

    return {
      org_id: org.orgId,
      full_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      email: `${emailPrefix}-debtor${String(i + 1).padStart(3, '0')}@example.com`,
      phone: `+1${rand(2000000000, 9999999999)}`,
      reference_number: `REF-${org.slug.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
      total_owed: totalOwed,
      outstanding_amount: outstandingAmount,
      days_overdue: daysOverdue,
      status,
      risk_score: score.score,
      risk_label: score.risk_label,
      recommended_action: score.recommended_action,
      best_contact_channel: score.best_contact_channel,
      ai_source: 'deterministic',
      contact_attempts: contactAttempts,
      failed_payments: failedPayments,
      ai_analyzed_at: new Date().toISOString(),
    }
  })
}

async function resetOrg(supabase: SeedClient, org: OrgSpec) {
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', org.slug)
    .single()

  if (existingOrg?.id) {
    await supabase.from('organizations').delete().eq('id', existingOrg.id)
  }

  const { data: existing } = await supabase.auth.admin.listUsers()
  const existingUser = existing?.users?.find((user) => user.email === org.email)
  if (existingUser) await supabase.auth.admin.deleteUser(existingUser.id)
}

async function insertAccounts(supabase: SeedClient, orgId: string, debtors: Tables<'debtors'>[]) {
  const today = new Date()
  const rows: TableInsert<'accounts'>[] = debtors.map((debtor) => ({
    debtor_id: debtor.id,
    org_id: orgId,
    loan_type: pick(LOAN_TYPES),
    original_amount: debtor.total_owed,
    outstanding_amount: debtor.outstanding_amount,
    opened_at: shiftDate(today, -rand(180, 1800)),
    default_date: debtor.days_overdue > 0 ? shiftDate(today, -debtor.days_overdue) : null,
  }))

  await supabase.from('accounts').insert(rows)
}

async function insertPayments(
  supabase: SeedClient,
  orgId: string,
  debtors: Tables<'debtors'>[],
  count: number
) {
  const today = new Date()
  const rows: TableInsert<'payments'>[] = debtors.slice(0, count).map((debtor) => ({
    debtor_id: debtor.id,
    org_id: orgId,
    amount: randAmount(100, Math.max(Number(debtor.total_owed) * 0.25, 100)),
    payment_date: shiftDate(today, -rand(1, 90)),
    method: pick(METHODS) as Method,
    status: 'completed',
  }))

  if (rows.length > 0) {
    await supabase.from('payments').insert(rows)
  }
}

async function insertPaymentPlans(
  supabase: SeedClient,
  orgId: string,
  debtors: Tables<'debtors'>[],
  count: number
) {
  const today = new Date()
  const planDebtors = debtors.filter((debtor) => debtor.status === 'in_payment_plan').slice(0, count)

  for (const debtor of planDebtors) {
    const installmentAmount = randAmount(150, 600)
    const installmentsTotal = Math.max(2, Math.ceil(Number(debtor.outstanding_amount) / installmentAmount))
    const installmentsPaid = rand(1, Math.max(1, Math.floor(installmentsTotal / 2)))
    const startDate = new Date(today)
    startDate.setMonth(startDate.getMonth() - installmentsPaid)

    const { data: planData } = await supabase
      .from('payment_plans')
      .insert({
        debtor_id: debtor.id,
        org_id: orgId,
        total_amount: debtor.outstanding_amount,
        installment_amount: installmentAmount,
        frequency: 'monthly',
        start_date: startDate.toISOString().split('T')[0],
        installments_total: installmentsTotal,
        installments_paid: installmentsPaid,
        status: 'active',
      })
      .select()
      .single()
    const plan = planData as Tables<'payment_plans'> | null

    if (!plan) continue

    const installments: TableInsert<'payment_installments'>[] = Array.from(
      { length: installmentsTotal },
      (_, index) => ({
        plan_id: plan.id,
        due_date: shiftMonth(startDate, index),
        amount: installmentAmount,
        status: index < installmentsPaid ? 'paid' : 'upcoming',
        paid_at: index < installmentsPaid ? new Date(startDate.getTime() + index * 30 * 86400000).toISOString() : null,
      })
    )

    await supabase.from('payment_installments').insert(installments)
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'payment_plan_created',
      entity_type: 'payment_plan',
      entity_id: plan.id,
      metadata: {
        debtor_id: debtor.id,
        installments_total: installmentsTotal,
        installment_amount: installmentAmount,
      },
    })
  }
}

async function insertCampaigns(
  supabase: SeedClient,
  orgId: string,
  debtors: Tables<'debtors'>[],
  options: SeedOptions
) {
  const today = new Date()

  for (const spec of CAMPAIGN_SPECS.slice(0, options.campaignCount)) {
    const targeted = getTargetedDebtors(debtors, spec.segment).slice(0, options.campaignTargetCap)
    const sentCount = spec.status !== 'draft' ? targeted.length : 0
    const responseCount = spec.status === 'draft' ? 0 : Math.min(sentCount, Math.floor(sentCount * (rand(10, 30) / 100)))

    const { data: campaignData } = await supabase
      .from('campaigns')
      .insert({
        org_id: orgId,
        name: spec.name,
        status: spec.status,
        target_segment: spec.segment,
        channel: spec.channel,
        message_template: spec.template,
        sent_count: sentCount,
        response_count: responseCount,
        scheduled_at: shiftDate(today, -rand(2, 20)) + 'T09:00:00Z',
      })
      .select()
      .single()
    const campaign = campaignData as Tables<'campaigns'> | null

    if (!campaign || spec.status === 'draft' || targeted.length === 0) continue

    const sentAt = shiftDate(today, -rand(1, 14)) + 'T09:00:00Z'
    const respondedIds = new Set(targeted.slice(0, responseCount).map((debtor) => debtor.id))

    const communications: TableInsert<'communications'>[] = targeted.map((debtor) => ({
      debtor_id: debtor.id,
      org_id: orgId,
      campaign_id: campaign.id,
      channel: spec.channel,
      direction: 'outbound',
      status: respondedIds.has(debtor.id) ? 'responded' : 'sent',
      message: spec.template
        .replace('{{debtor_name}}', debtor.full_name.split(' ')[0])
        .replace('{{amount}}', Number(debtor.outstanding_amount).toFixed(2))
        .replace('{{reference}}', debtor.reference_number),
      sent_at: sentAt,
    }))

    const campaignDebtors: TableInsert<'campaign_debtors'>[] = targeted.map((debtor) => ({
      campaign_id: campaign.id,
      debtor_id: debtor.id,
      status: respondedIds.has(debtor.id) ? 'responded' : 'sent',
      sent_at: sentAt,
      responded_at: respondedIds.has(debtor.id) ? sentAt : null,
    }))

    await supabase.from('communications').insert(communications)
    await supabase.from('campaign_debtors').insert(campaignDebtors)
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'campaign_sent',
      entity_type: 'campaign',
      entity_id: campaign.id,
      metadata: {
        target_count: targeted.length,
        response_count: responseCount,
      },
    })

    const responseLogs: TableInsert<'audit_logs'>[] = targeted
      .filter((debtor) => respondedIds.has(debtor.id))
      .map((debtor) => ({
        org_id: orgId,
        action: 'campaign_response_logged',
        entity_type: 'campaign',
        entity_id: campaign.id,
        metadata: {
          debtor_id: debtor.id,
          channel: spec.channel,
        },
      }))

    if (responseLogs.length > 0) {
      await supabase.from('audit_logs').insert(responseLogs)
    }
  }
}

async function populateOrganizationData(
  supabase: SeedClient,
  org: OrgSeedTarget,
  options: SeedOptions
) {
  const { data: debtorData } = await supabase
    .from('debtors')
    .insert(buildDebtorRows(org, options.debtorCount))
    .select()
  const debtors = (debtorData ?? []) as Tables<'debtors'>[]

  const debtorRows = debtors ?? []
  if (debtorRows.length === 0) return 0

  await insertAccounts(supabase, org.orgId, debtorRows)
  await insertPayments(supabase, org.orgId, debtorRows, options.paymentCount)
  await insertPaymentPlans(supabase, org.orgId, debtorRows, options.paymentPlanCount)
  await insertCampaigns(supabase, org.orgId, debtorRows, options)

  return debtorRows.length
}

export async function populateStarterOrgData(supabase: SeedClient, org: OrgSeedTarget) {
  const { count } = await supabase
    .from('debtors')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.orgId)

  if ((count ?? 0) > 0) return { debtors: count ?? 0 }

  const debtors = await populateOrganizationData(supabase, org, STARTER_SEED_OPTIONS)
  return { debtors }
}

export async function seedAll(supabase: SeedClient) {
  const orgs: OrgSpec[] = [
    { name: 'Apex Credit Union', slug: 'apex-credit-union', email: 'demo@debtflowpro.com' },
    { name: 'Meridian Lending', slug: 'meridian-lending', email: 'demo2@debtflowpro.com' },
  ]

  let totalDebtors = 0

  for (const orgSpec of orgs) {
    await resetOrg(supabase, orgSpec)

    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: orgSpec.name, slug: orgSpec.slug })
      .select()
      .single()
    const org = orgData as Tables<'organizations'> | null

    if (!org) continue

    const { data: authData } = await supabase.auth.admin.createUser({
      email: orgSpec.email,
      password: 'Demo1234!',
      email_confirm: true,
    })

    if (authData.user) {
      await supabase.from('users').insert({
        id: authData.user.id,
        org_id: org.id,
        email: orgSpec.email,
        full_name: orgSpec.email === 'demo@debtflowpro.com' ? 'Alex Morgan' : 'Jordan Lee',
        role: 'admin',
      })
    }

    totalDebtors += await populateOrganizationData(
      supabase,
      { orgId: org.id, orgName: org.name, slug: org.slug },
      FULL_SEED_OPTIONS
    )
  }

  return { organizations: orgs.length, debtors: totalDebtors }
}
