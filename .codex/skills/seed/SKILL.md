---
name: seed
description: Demo data seed script for DebtFlow Pro. Read this skill before implementing the /api/seed endpoint, the seed data generation function, or any logic that populates the database with demo records. Also read this when the app needs to look populated for judges or Product Hunt visitors, or when adding a new table that needs seed records.
---

# Seed Data — DebtFlow Pro

The seed script creates a realistic dataset so the app looks like a live production tool on first visit. Judges and Product Hunt visitors need to see populated dashboards, active campaigns, and meaningful analytics — not empty tables.

The seed is triggered by a single HTTP call to a protected endpoint. It uses the Supabase service role key to bypass RLS and write directly across all tables.

---

## What the Seed Creates

Run through this checklist mentally when implementing or extending the seed:

- **2 organizations**: "Apex Credit Union" and "Meridian Lending"
- **1 admin user per org** with a predictable demo login
- **80 debtors per org** — varied amounts ($500–$50,000), days overdue (0–200), statuses across the full spread, and pre-calculated risk scores
- **1 account record per debtor** with loan type and dates
- **30 payment records per org** spread across different debtors and methods
- **10 active payment plans per org** with all installment rows generated
- **5 campaigns per org** — mix of draft, active, and completed
- **Communication records** for all non-draft campaigns (one per targeted debtor)
- **campaign_debtor join records** for all non-draft campaigns

The end result: a dashboard that shows real numbers, charts with actual data points, and debtor profiles that look like genuine accounts.

---

## Seed Endpoint (`app/api/seed/route.ts`)

This endpoint is the only way to trigger the seed. Protect it with a secret header — never leave it open.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { seedAll } from '@/lib/seed'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Must use service role to bypass RLS for seeding
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const summary = await seedAll(supabase)
    return NextResponse.json({ success: true, ...summary })
  } catch (e: any) {
    console.error('Seed failed:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

---

## Seed Script (`lib/seed.ts`)

Implement this in two layers: helper functions at the top, then the main `seedAll` export at the bottom. The helpers keep the seeding logic readable.

```ts
import { SupabaseClient } from '@supabase/supabase-js'
import { scoreDebtor } from './scoring'

// ── Helpers ──────────────────────────────────────────────────────────────────

const FIRST_NAMES = ['James','Sarah','Michael','Emma','David','Priya','Carlos','Aisha','Tom','Linda','Raj','Maria','Kevin','Fatima','Daniel','Yuki']
const LAST_NAMES  = ['Smith','Johnson','Williams','Patel','Garcia','Chen','Thompson','Ahmed','Wilson','Sharma','Nguyen','Okafor','Kim','Martinez']
const LOAN_TYPES  = ['Personal Loan','Auto Loan','Credit Card','Business Loan','Home Equity Line']
const METHODS     = ['bank_transfer','card','portal','cash']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randAmount(min: number, max: number) { return Math.round(rand(min * 100, max * 100)) / 100 }
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

// Maps a debtor index to a realistic status distribution
function pickStatus(i: number): string {
  const buckets = [
    { max: 10, status: 'current' },
    { max: 25, status: 'overdue_30' },
    { max: 45, status: 'overdue_60' },
    { max: 60, status: 'overdue_90' },
    { max: 75, status: 'in_payment_plan' },
    { max: 85, status: 'settled' },
    { max: 80, status: 'written_off' },
  ]
  for (const b of buckets) { if (i < b.max) return b.status }
  return 'overdue_60'
}

function daysForStatus(status: string): number {
  switch (status) {
    case 'current':         return 0
    case 'overdue_30':      return rand(30, 59)
    case 'overdue_60':      return rand(60, 89)
    case 'overdue_90':      return rand(90, 200)
    case 'in_payment_plan': return rand(10, 120)
    default:                return 0
  }
}

// ── Main Seed ─────────────────────────────────────────────────────────────────

export async function seedAll(supabase: SupabaseClient) {
  const orgs = [
    { name: 'Apex Credit Union', slug: 'apex-credit-union', email: 'demo@debtflowpro.com' },
    { name: 'Meridian Lending',  slug: 'meridian-lending',  email: 'demo2@debtflowpro.com' },
  ]

  let totalDebtors = 0

  for (const orgSpec of orgs) {
    // 1. Organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: orgSpec.name, slug: orgSpec.slug })
      .select()
      .single()

    // 2. Demo user (Supabase auth + users table)
    // Delete existing user if re-seeding
    const { data: existing } = await supabase.auth.admin.listUsers()
    const existingUser = existing?.users?.find(u => u.email === orgSpec.email)
    if (existingUser) await supabase.auth.admin.deleteUser(existingUser.id)

    const { data: authData } = await supabase.auth.admin.createUser({
      email: orgSpec.email,
      password: 'Demo1234!',
      email_confirm: true,
    })
    if (authData.user) {
      await supabase.from('users').insert({
        id: authData.user.id,
        org_id: org!.id,
        email: orgSpec.email,
        full_name: orgs.indexOf(orgSpec) === 0 ? 'Alex Morgan' : 'Jordan Lee',
        role: 'admin',
      })
    }

    // 3. Debtors (80 per org)
    const debtorRows = Array.from({ length: 80 }, (_, i) => {
      const status      = pickStatus(i)
      const daysOverdue = daysForStatus(status)
      const totalOwed   = randAmount(500, 50000)
      const outstanding = status === 'settled' ? 0 : randAmount(totalOwed * 0.3, totalOwed)
      const contactAttempts = rand(0, 12)
      const failedPayments  = rand(0, 5)

      const score = scoreDebtor({ days_overdue: daysOverdue, outstanding_amount: outstanding, contact_attempts: contactAttempts, failed_payments: failedPayments, total_owed: totalOwed })

      return {
        org_id: org!.id,
        full_name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        email: `debtor${i + 1}@example.com`,
        phone: `+1${rand(2000000000, 9999999999)}`,
        reference_number: `REF-${orgSpec.slug.slice(0,3).toUpperCase()}-${String(i + 1).padStart(4,'0')}`,
        total_owed: totalOwed,
        outstanding_amount: outstanding,
        days_overdue: daysOverdue,
        status,
        risk_score: score.score,
        risk_label: score.risk_label,
        recommended_action: score.recommended_action,
        best_contact_channel: score.best_contact_channel,
        contact_attempts: contactAttempts,
        failed_payments: failedPayments,
        ai_analyzed_at: new Date().toISOString(),
      }
    })

    const { data: debtors } = await supabase.from('debtors').insert(debtorRows).select()
    totalDebtors += debtors?.length ?? 0

    // 4. Accounts (one per debtor)
    const today = new Date()
    await supabase.from('accounts').insert(
      debtors!.map(d => ({
        debtor_id: d.id,
        org_id: org!.id,
        loan_type: pick(LOAN_TYPES),
        original_amount: d.total_owed,
        outstanding_amount: d.outstanding_amount,
        opened_at: shiftDate(today, -rand(180, 1800)),
        default_date: d.days_overdue > 0 ? shiftDate(today, -d.days_overdue) : null,
      }))
    )

    // 5. Payments (30 per org — scattered across first 40 debtors)
    await supabase.from('payments').insert(
      debtors!.slice(0, 30).map(d => ({
        debtor_id: d.id,
        org_id: org!.id,
        amount: randAmount(100, Number(d.total_owed) * 0.25),
        payment_date: shiftDate(today, -rand(1, 90)),
        method: pick(METHODS),
        status: 'completed',
      }))
    )

    // 6. Payment plans (for in_payment_plan debtors, up to 10)
    const planDebtors = debtors!.filter(d => d.status === 'in_payment_plan').slice(0, 10)
    for (const d of planDebtors) {
      const installmentAmount = randAmount(150, 600)
      const total = Math.ceil(Number(d.outstanding_amount) / installmentAmount)
      const paid  = rand(1, Math.floor(total / 2))
      const start = new Date(today)
      start.setMonth(start.getMonth() - paid)

      const { data: plan } = await supabase.from('payment_plans').insert({
        debtor_id: d.id,
        org_id: org!.id,
        total_amount: d.outstanding_amount,
        installment_amount: installmentAmount,
        frequency: 'monthly',
        start_date: start.toISOString().split('T')[0],
        installments_total: total,
        installments_paid: paid,
        status: 'active',
      }).select().single()

      await supabase.from('payment_installments').insert(
        Array.from({ length: total }, (_, i) => ({
          plan_id: plan!.id,
          due_date: shiftMonth(start, i),
          amount: installmentAmount,
          status: i < paid ? 'paid' : 'upcoming',
          paid_at: i < paid ? new Date(start.getTime() + i * 30 * 86400000).toISOString() : null,
        }))
      )
    }

    // 7. Campaigns (5 per org) and their communication records
    const campaignSpecs = [
      { name: 'Q1 Overdue Reminder',   status: 'completed', segment: 'overdue_30', channel: 'email',
        template: 'Dear {{debtor_name}}, your balance of ${{amount}} is past due (ref {{reference}}). Please contact us to arrange payment.' },
      { name: 'High-Value Recovery',   status: 'completed', segment: 'overdue_90', channel: 'sms',
        template: '[DebtFlow] URGENT: ${{amount}} outstanding on {{reference}}. Call 1-800-DEBTFLOW today.' },
      { name: 'March Settlement Offer',status: 'active',    segment: 'overdue_60', channel: 'email',
        template: 'Dear {{debtor_name}}, settle your ${{amount}} balance (ref: {{reference}}) at a reduced rate before month end.' },
      { name: 'Payment Plan Invite',   status: 'draft',     segment: 'all',        channel: 'email',
        template: 'Dear {{debtor_name}}, we can help you manage your ${{amount}} balance with a flexible monthly plan.' },
      { name: 'Final Notice',          status: 'completed', segment: 'overdue_90', channel: 'sms',
        template: '[DebtFlow] Final notice: ${{amount}} on account {{reference}}. Legal action may follow without response.' },
    ] as const

    for (const spec of campaignSpecs) {
      // Determine which debtors this campaign targets
      const targeted = debtors!.filter(d => {
        if (spec.segment === 'all') return true
        if (spec.segment === 'overdue_30') return d.days_overdue >= 30
        if (spec.segment === 'overdue_60') return d.days_overdue >= 60
        if (spec.segment === 'overdue_90') return d.days_overdue >= 90
        return false
      }).slice(0, 30) // cap at 30 for seed performance

      const sentCount = spec.status !== 'draft' ? targeted.length : 0
      const responseCount = Math.floor(sentCount * (rand(10, 30) / 100))

      const { data: campaign } = await supabase.from('campaigns').insert({
        org_id: org!.id,
        name: spec.name,
        status: spec.status,
        target_segment: spec.segment,
        channel: spec.channel,
        message_template: spec.template,
        sent_count: sentCount,
        response_count: responseCount,
        scheduled_at: shiftDate(today, -rand(2, 20)) + 'T09:00:00Z',
      }).select().single()

      if (spec.status !== 'draft' && campaign && targeted.length > 0) {
        const sentAt = shiftDate(today, -rand(1, 14)) + 'T09:00:00Z'

        await supabase.from('communications').insert(
          targeted.map(d => ({
            debtor_id: d.id,
            org_id: org!.id,
            campaign_id: campaign.id,
            channel: spec.channel,
            direction: 'outbound',
            status: 'sent',
            message: spec.template
              .replace('{{debtor_name}}', d.full_name.split(' ')[0])
              .replace('{{amount}}', Number(d.outstanding_amount).toFixed(2))
              .replace('{{reference}}', d.reference_number),
            sent_at: sentAt,
          }))
        )

        await supabase.from('campaign_debtors').insert(
          targeted.map(d => ({
            campaign_id: campaign.id,
            debtor_id: d.id,
            status: 'sent',
            sent_at: sentAt,
          }))
        )
      }
    }
  }

  return { organizations: 2, debtors: totalDebtors }
}
```

---

## How to Run the Seed

After deploying or during local development:

```bash
# Local
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: debtflow-seed-2026"

# Production (replace with your Vercel URL)
curl -X POST https://your-app.vercel.app/api/seed \
  -H "x-seed-secret: debtflow-seed-2026"
```

The seed is idempotent — running it twice clears existing data first and re-creates everything fresh. This makes it safe to run repeatedly during development.

---

## Demo Credentials

After seeding, these credentials will work on the login page:

| Email | Password | Organization |
|-------|----------|-------------|
| `demo@debtflowpro.com` | `Demo1234!` | Apex Credit Union |
| `demo2@debtflowpro.com` | `Demo1234!` | Meridian Lending |

Always use the first account for demos — it has the richer dataset.