import { NextRequest, NextResponse } from 'next/server'
import { generateScoringNarrative } from '@/lib/ai/scoringNarrative'
import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { scoreDebtor } from '@/lib/scoring'
import type { ScoreRequest, ScoreResponse } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { debtor_id } = (await req.json()) as ScoreRequest
  if (!debtor_id) return NextResponse.json({ error: 'debtor_id is required' }, { status: 400 })

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

  const { data: debtor, error } = await supabase
    .from('debtors')
    .select('id, days_overdue, outstanding_amount, contact_attempts, failed_payments, total_owed')
    .eq('id', debtor_id)
    .eq('org_id', orgId)
    .single()

  if (error || !debtor) return NextResponse.json({ error: 'Debtor not found' }, { status: 404 })

  const result = scoreDebtor({
    days_overdue: debtor.days_overdue,
    outstanding_amount: Number(debtor.outstanding_amount),
    contact_attempts: debtor.contact_attempts,
    failed_payments: debtor.failed_payments,
    total_owed: Number(debtor.total_owed),
  })
  const narrativeResult = await generateScoringNarrative({
    debtor: {
      days_overdue: debtor.days_overdue,
      outstanding_amount: Number(debtor.outstanding_amount),
      contact_attempts: debtor.contact_attempts,
      failed_payments: debtor.failed_payments,
      total_owed: Number(debtor.total_owed),
    },
    score: result,
  })

  await supabase
    .from('debtors')
    .update({
      risk_score: result.score,
      risk_label: result.risk_label,
      recommended_action: result.recommended_action,
      best_contact_channel: result.best_contact_channel,
      ai_summary: narrativeResult.aiSummary,
      ai_source: narrativeResult.aiSource,
      ai_model: narrativeResult.aiModel,
      ai_analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', debtor_id)

  const response: ScoreResponse = {
    ...result,
    ai_summary: narrativeResult.aiSummary,
    ai_source: narrativeResult.aiSource,
    ai_model: narrativeResult.aiModel,
  }

  return NextResponse.json(response)
}
