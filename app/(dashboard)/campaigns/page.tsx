import { createServerClient, ensureUserOrg } from '@/lib/supabase/server'
import { CampaignsList } from '@/components/campaigns/CampaignsList'
import type { Tables } from '@/lib/types'

export default async function CampaignsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { orgId, role } = user ? await ensureUserOrg(user) : { orgId: null, role: null }
  const { data: campaignsData } = orgId
    ? await supabase.from('campaigns').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
    : { data: [] }
  const campaigns = (campaignsData ?? []) as Tables<'campaigns'>[]

  return <CampaignsList campaigns={campaigns} orgId={orgId ?? ''} canManage={role !== 'viewer'} />
}
