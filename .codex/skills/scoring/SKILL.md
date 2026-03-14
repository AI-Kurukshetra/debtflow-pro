---
name: scoring
description: Risk scoring engine for DebtFlow Pro. Read this skill before implementing the risk score calculation, the RiskScoreBadge component, the /api/score route, or the "Re-analyze" button. Also read this when adding new scoring factors, changing score thresholds, or displaying score-related recommendations on the debtor detail page.
---

# Risk Scoring — DebtFlow Pro

DebtFlow Pro presents risk scoring as an "AI-powered" feature. In reality, it is a deterministic rule-based function — no external API is called. This keeps costs at zero while still delivering useful, logic-driven recommendations.

The score is calculated on demand and stored back into the `debtors` table. Users can trigger a re-analysis at any time from the debtor detail page.

---

## Scoring Logic (`lib/scoring.ts`)

Implement this function exactly as written. The weight of each factor is intentional — do not rebalance without a specific user request.

```ts
export interface DebtorInput {
  days_overdue: number
  outstanding_amount: number
  contact_attempts: number
  failed_payments: number
  total_owed: number
}

export interface RiskScore {
  score: number                               // 0–100
  risk_label: 'low' | 'medium' | 'high' | 'critical'
  recommended_action: string
  best_contact_channel: 'sms' | 'email' | 'call'
  best_contact_time: string
}

export function scoreDebtor(input: DebtorInput): RiskScore {
  let score = 0

  // Factor 1: Days overdue (0–40 points)
  // This is the most predictive signal — weight it highest
  if (input.days_overdue > 180) score += 40
  else if (input.days_overdue > 90) score += 30
  else if (input.days_overdue > 60) score += 20
  else if (input.days_overdue > 30) score += 10

  // Factor 2: Outstanding amount (0–25 points)
  // Higher balances warrant more aggressive recovery effort
  if (input.outstanding_amount > 50000) score += 25
  else if (input.outstanding_amount > 20000) score += 18
  else if (input.outstanding_amount > 10000) score += 12
  else if (input.outstanding_amount > 5000) score += 6

  // Factor 3: Failed contact attempts (0–20 points)
  // Repeated non-response signals deliberate avoidance
  if (input.contact_attempts > 10) score += 20
  else if (input.contact_attempts > 5) score += 12
  else if (input.contact_attempts > 2) score += 5

  // Factor 4: Failed payments (0–15 points)
  // Each failed payment adds 5 points, capped at 15
  score += Math.min(input.failed_payments * 5, 15)

  // Clamp to valid range
  score = Math.min(Math.max(score, 0), 100)

  const risk_label = score >= 75 ? 'critical'
    : score >= 50 ? 'high'
    : score >= 25 ? 'medium'
    : 'low'

  // Channel recommendation: escalate to calls for severely overdue accounts
  const best_contact_channel: RiskScore['best_contact_channel'] =
    input.days_overdue > 90 ? 'call'
    : input.days_overdue > 30 ? 'sms'
    : 'email'

  return {
    score,
    risk_label,
    recommended_action: getRecommendation(risk_label, input),
    best_contact_channel,
    best_contact_time: getContactTime(best_contact_channel),
  }
}

function getRecommendation(label: RiskScore['risk_label'], input: DebtorInput): string {
  const discount = input.outstanding_amount > 10000 ? '30%' : '20%'
  switch (label) {
    case 'critical':
      return 'Escalate to legal review immediately. Offer a one-time settlement at a significant discount as a last resort.'
    case 'high':
      return `Schedule a phone call within 24 hours. Offer a ${discount} settlement discount or a structured payment plan.`
    case 'medium':
      return 'Send an SMS payment reminder. Offer a flexible monthly payment plan.'
    case 'low':
      return 'Send a friendly email reminder. No urgent action required — monitor for changes.'
  }
}

function getContactTime(channel: RiskScore['best_contact_channel']): string {
  switch (channel) {
    case 'call': return 'Weekday mornings 9–11am or evenings 5–7pm'
    case 'sms':  return 'Weekday afternoons 2–5pm'
    case 'email': return 'Any weekday business hours'
  }
}
```

---

## API Route (`app/api/score/route.ts`)

This route accepts a `debtor_id`, calculates the score, saves it back to the database, and returns the result. It is called by the "Re-analyze" button on the debtor detail page.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { scoreDebtor } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  const { debtor_id } = await req.json()
  if (!debtor_id) return NextResponse.json({ error: 'debtor_id is required' }, { status: 400 })

  const supabase = createServerClient()

  // Verify the user is authenticated and owns this debtor
  const { data: debtor, error } = await supabase
    .from('debtors')
    .select('id, days_overdue, outstanding_amount, contact_attempts, failed_payments, total_owed')
    .eq('id', debtor_id)
    .single()

  if (error || !debtor) return NextResponse.json({ error: 'Debtor not found' }, { status: 404 })

  const result = scoreDebtor({
    days_overdue: debtor.days_overdue,
    outstanding_amount: debtor.outstanding_amount,
    contact_attempts: debtor.contact_attempts,
    failed_payments: debtor.failed_payments,
    total_owed: debtor.total_owed,
  })

  // Persist the result — this is the source of truth for the UI
  await supabase.from('debtors').update({
    risk_score: result.score,
    risk_label: result.risk_label,
    recommended_action: result.recommended_action,
    best_contact_channel: result.best_contact_channel,
    ai_analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', debtor_id)

  return NextResponse.json(result)
}
```

---

## UI Components

### RiskScoreBadge

Display the score and label together. Use this on both the debtor list (compact) and debtor detail (full) views.

```tsx
// components/debtors/RiskScoreBadge.tsx
type RiskLabel = 'low' | 'medium' | 'high' | 'critical'

const STYLES: Record<RiskLabel, { pill: string; dot: string; label: string }> = {
  low:      { pill: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  label: 'Low Risk' },
  medium:   { pill: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', label: 'Medium Risk' },
  high:     { pill: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500', label: 'High Risk' },
  critical: { pill: 'bg-red-100 text-red-800',       dot: 'bg-red-500',    label: 'Critical' },
}

export function RiskScoreBadge({
  score,
  label,
  size = 'sm',
}: {
  score: number
  label: RiskLabel
  size?: 'sm' | 'lg'
}) {
  const s = STYLES[label]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${s.pill} ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {size === 'lg' && <span className="font-bold">{score}/100 ·</span>}
      {s.label}
    </span>
  )
}
```

### AI Insight Card (debtor detail page)

Show the score, recommendation, and re-analyze button together in a card. This is the primary "AI feature" that judges and Product Hunt visitors will notice.

```tsx
// Inside the debtor detail Overview tab
'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskScoreBadge } from './RiskScoreBadge'
import { Sparkles, Phone, Mail, MessageSquare } from 'lucide-react'

const CHANNEL_ICON = { call: Phone, email: Mail, sms: MessageSquare }
const CHANNEL_LABEL = { call: 'Phone call', email: 'Email', sms: 'SMS' }

export function AIInsightCard({ debtor, onRefresh }: { debtor: Debtor; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)

  async function reanalyze() {
    setLoading(true)
    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debtor_id: debtor.id }),
    })
    setLoading(false)
    onRefresh()
  }

  const Icon = debtor.best_contact_channel ? CHANNEL_ICON[debtor.best_contact_channel] : Mail

  return (
    <Card className="border-purple-100 bg-purple-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Risk Assessment
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={reanalyze} disabled={loading} className="text-xs">
            {loading ? 'Analyzing...' : '↻ Re-analyze'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {debtor.risk_label && debtor.risk_score !== null ? (
          <>
            <RiskScoreBadge score={debtor.risk_score!} label={debtor.risk_label as any} size="lg" />
            <p className="text-sm text-gray-700">{debtor.recommended_action}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Icon className="h-3.5 w-3.5" />
              <span>Best channel: <strong>{CHANNEL_LABEL[debtor.best_contact_channel as keyof typeof CHANNEL_LABEL]}</strong></span>
            </div>
            {debtor.ai_analyzed_at && (
              <p className="text-xs text-gray-400">
                Last analyzed: {new Date(debtor.ai_analyzed_at).toLocaleDateString()}
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">No risk analysis yet</p>
            <Button size="sm" onClick={reanalyze} disabled={loading}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {loading ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Scoring Decision Reference

Use this table when explaining the scoring to users or in the demo video:

| Factor | Max Points | Why It Matters |
|--------|-----------|----------------|
| Days overdue | 40 | Time is the strongest predictor of non-recovery |
| Outstanding amount | 25 | Higher balances justify more recovery effort |
| Contact attempts (no response) | 20 | Non-response signals avoidance behavior |
| Failed payments | 15 | Demonstrates willingness-to-pay problem |

| Score | Label | Action |
|-------|-------|--------|
| 0–24 | Low | Email reminder, monitor |
| 25–49 | Medium | SMS + payment plan offer |
| 50–74 | High | Phone call + settlement offer |
| 75–100 | Critical | Legal escalation |