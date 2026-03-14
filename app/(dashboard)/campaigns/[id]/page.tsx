import { notFound } from 'next/navigation'
import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { CampaignRecipientTable } from '@/components/campaigns/CampaignRecipientTable'
import type { Tables } from '@/lib/types'

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { orgId, role } = user ? await ensureUserOrg(user) : { orgId: null, role: null }

  if (!orgId) return notFound()

  const { data: campaignData, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()
  const campaign = campaignData as Tables<'campaigns'> | null
  if (error || !campaign) return notFound()

  const { data: rowData } = await supabase
    .from('campaign_debtors')
    .select('id, status, sent_at, debtor_id')
    .eq('campaign_id', campaign.id)
  const rows = (rowData ?? []) as Pick<
    Tables<'campaign_debtors'>,
    'id' | 'status' | 'sent_at' | 'debtor_id'
  >[]

  const debtorIds = Array.from(new Set((rows ?? []).map((r) => r.debtor_id)))
  const { data: debtorData } = debtorIds.length
    ? await supabase.from('debtors').select('id, full_name, reference_number, status').in('id', debtorIds)
    : { data: [] }
  const debtors = (debtorData ?? []) as Pick<
    Tables<'debtors'>,
    'id' | 'full_name' | 'reference_number' | 'status'
  >[]
  const debtorMap = new Map((debtors ?? []).map((d) => [d.id, d]))
  const recipientRows = rows.map((row) => ({
    id: row.id,
    debtor_id: row.debtor_id,
    status: row.status,
    full_name: debtorMap.get(row.debtor_id)?.full_name ?? '-',
    reference_number: debtorMap.get(row.debtor_id)?.reference_number ?? '-',
    debtor_status: debtorMap.get(row.debtor_id)?.status ?? 'current',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{campaign.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {campaign.channel.toUpperCase()} · {campaign.target_segment.replace('_', ' ')}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <CampaignRecipientTable campaignId={campaign.id} rows={recipientRows} canManage={role !== 'viewer'} />
        </CardContent>
      </Card>
    </div>
  )
}
