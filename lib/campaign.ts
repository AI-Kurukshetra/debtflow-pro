import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

type CampaignRow = Database['public']['Tables']['campaigns']['Row']
type CampaignDebtorTarget = Pick<
  Database['public']['Tables']['debtors']['Row'],
  'id' | 'full_name' | 'outstanding_amount' | 'reference_number'
>
type CommunicationInsert = Database['public']['Tables']['communications']['Insert']
type CampaignDebtorInsert = Database['public']['Tables']['campaign_debtors']['Insert']

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export const DEFAULT_TEMPLATES = {
  email: {
    reminder:
      'Dear {{debtor_name}},\n\nThis is a reminder that your account balance of ${{amount}} is overdue. Please contact us at your earliest convenience to discuss payment options.\n\nYour reference number: {{reference}}\n\nThank you for your attention to this matter.',
    settlement:
      'Dear {{debtor_name}},\n\nWe would like to offer you an opportunity to resolve your outstanding balance of ${{amount}} with a reduced settlement. Please contact us before the end of the month to take advantage of this offer.\n\nReference: {{reference}}',
  },
  sms: {
    reminder:
      '[DebtFlow] Hi {{debtor_name}}, your balance of ${{amount}} (ref: {{reference}}) is overdue. Please call us or visit our portal to arrange payment.',
    urgent:
      '[DebtFlow] URGENT: ${{amount}} outstanding on account {{reference}}. Contact us today to avoid further action.',
  },
} as const

export async function sendCampaign(
  supabase: SupabaseClient<Database>,
  campaignId: string
): Promise<{ sent: number }> {
  const { data: campaignData, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  const campaign = campaignData as CampaignRow | null

  if (campaignError || !campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error('Campaign has already been sent')

  let query = supabase
    .from('debtors')
    .select('id, full_name, outstanding_amount, reference_number')
    .eq('org_id', campaign.org_id)

  switch (campaign.target_segment) {
    case 'overdue_30':
      query = query.gte('days_overdue', 30)
      break
    case 'overdue_60':
      query = query.gte('days_overdue', 60)
      break
    case 'overdue_90':
      query = query.gte('days_overdue', 90)
      break
    case 'in_payment_plan':
      query = query.eq('status', 'in_payment_plan')
      break
  }

  const { data: debtorRows, error: debtorError } = await query
  const debtors = (debtorRows ?? []) as CampaignDebtorTarget[]
  if (debtorError) throw new Error('Failed to fetch debtors')
  if (!debtors || debtors.length === 0) throw new Error('No debtors match this segment')

  const now = new Date().toISOString()
  const comms: CommunicationInsert[] = debtors.map((d) => ({
    debtor_id: d.id,
    org_id: campaign.org_id,
    campaign_id: campaign.id,
    channel: campaign.channel,
    direction: 'outbound',
    status: 'sent',
    message: interpolateTemplate(campaign.message_template, {
      debtor_name: d.full_name.split(' ')[0],
      amount: Number(d.outstanding_amount).toFixed(2),
      reference: d.reference_number,
    }),
    sent_at: now,
  }))

  const { error: commError } = await supabase.from('communications').insert(comms)
  if (commError) throw new Error('Failed to create communication records')

  const campaignDebtors: CampaignDebtorInsert[] = debtors.map((d) => ({
    campaign_id: campaign.id,
    debtor_id: d.id,
    status: 'sent',
    sent_at: now,
  }))
  await supabase.from('campaign_debtors').insert(campaignDebtors)

  await supabase
    .from('campaigns')
    .update({
      status: 'completed',
      sent_count: debtors.length,
    })
    .eq('id', campaign.id)

  return { sent: debtors.length }
}
