import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, ensureUserOrg, logAuditEvent } from '@/lib/supabase/server'
import type { CampaignRespondRequest, CampaignRespondResponse, TableInsert, Tables } from '@/lib/types'

type CampaignResponseCommunication = Pick<
  Tables<'communications'>,
  'id' | 'org_id' | 'campaign_id' | 'debtor_id' | 'channel'
>

export async function POST(req: NextRequest) {
  const { campaign_id, debtor_id, communication_id, notes } = (await req.json()) as CampaignRespondRequest

  if (!campaign_id || !debtor_id) {
    return NextResponse.json({ error: 'campaign_id and debtor_id are required' }, { status: 400 })
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

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, org_id')
    .eq('id', campaign_id)
    .eq('org_id', orgId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })
  }

  const { data: campaignDebtor } = await supabase
    .from('campaign_debtors')
    .select('id, status')
    .eq('campaign_id', campaign.id)
    .eq('debtor_id', debtor_id)
    .single()

  if (!campaignDebtor) {
    return NextResponse.json({ error: 'Debtor is not part of this campaign.' }, { status: 404 })
  }

  const now = new Date().toISOString()
  let communicationQuery = supabase
    .from('communications')
    .select('id, org_id, campaign_id, debtor_id, channel')
    .eq('campaign_id', campaign.id)
    .eq('debtor_id', debtor_id)
    .eq('direction', 'outbound')
    .order('sent_at', { ascending: false })
    .limit(1)

  if (communication_id) {
    communicationQuery = supabase
      .from('communications')
      .select('id, org_id, campaign_id, debtor_id, channel')
      .eq('id', communication_id)
      .eq('campaign_id', campaign.id)
      .eq('debtor_id', debtor_id)
      .limit(1)
  }

  const { data: communicationRows } = await communicationQuery
  const communication = (communicationRows?.[0] ?? null) as CampaignResponseCommunication | null

  if (!communication) {
    return NextResponse.json({ error: 'No outbound communication found for this debtor.' }, { status: 404 })
  }

  await supabase
    .from('communications')
    .update({ status: 'responded' })
    .eq('id', communication.id)

  const inboundCommunication: TableInsert<'communications'> = {
    debtor_id,
    org_id: communication.org_id,
    campaign_id: campaign.id,
    channel: communication.channel,
    direction: 'inbound',
    status: 'responded',
    message: notes?.trim() || 'Debtor response logged by collector.',
    sent_at: now,
  }
  await supabase.from('communications').insert(inboundCommunication)

  await supabase
    .from('campaign_debtors')
    .update({
      status: 'responded',
      responded_at: now,
    })
    .eq('id', campaignDebtor.id)

  const { count: responseCount } = await supabase
    .from('campaign_debtors')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .eq('status', 'responded')

  await supabase
    .from('campaigns')
    .update({ response_count: responseCount ?? 0 })
    .eq('id', campaign.id)

  await logAuditEvent(supabase, {
    orgId,
    userId: user.id,
    action: 'campaign_response_logged',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: {
      debtor_id,
      communication_id: communication.id,
      notes: notes?.trim() || null,
      response_count: responseCount ?? 0,
    },
  })

  const result: CampaignRespondResponse = {
    campaign_id: campaign.id,
    debtor_id,
    response_count: responseCount ?? 0,
  }

  return NextResponse.json(result)
}
