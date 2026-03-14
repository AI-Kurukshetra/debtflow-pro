---
name: campaigns
description: Campaign creation, send logic, communication simulation, and template system for DebtFlow Pro. Read this skill before building the campaigns page, campaign form, the /api/campaigns/send route, or any feature that involves sending outreach to debtors. Also read this when working on the communications tab of the debtor detail page.
---

# Campaigns — DebtFlow Pro

Campaigns are bulk outreach batches. A lender creates a campaign targeting a segment of their debtors (e.g. "all 90+ days overdue") via a chosen channel (SMS or email), with a message template. When they click Send, the system creates communication records for each targeted debtor — simulating the send without calling any real messaging API.

---

## Campaign Lifecycle

Understand this flow before implementing any campaign feature:

```
draft
  └─ user clicks "Send" → active (communications created, sent_count set)
                        → completed (all records written successfully)
  └─ user clicks "Pause" → paused
```

A campaign moves from `draft` to `active` the moment the send is triggered. It moves to `completed` once all communication records have been inserted. There is no intermediate state — if the send fails partway, mark the campaign `paused` and surface an error.

---

## Target Segments

These are the only valid segment values. They map directly to Supabase query filters.

| Segment value | Debtors included |
|---------------|-----------------|
| `all` | Every debtor in the org |
| `overdue_30` | `days_overdue >= 30` |
| `overdue_60` | `days_overdue >= 60` |
| `overdue_90` | `days_overdue >= 90` |
| `in_payment_plan` | `status = 'in_payment_plan'` |

---

## Message Templates

Templates use double-brace variables: `{{variable_name}}`. Supported variables:

| Variable | Replaced with |
|----------|--------------|
| `{{debtor_name}}` | Debtor's first name |
| `{{amount}}` | Outstanding amount as a decimal string (e.g. "1250.00") |
| `{{reference}}` | Reference number (e.g. "REF-APX-0042") |

Implement the interpolation function in `lib/campaign.ts`:

```ts
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}
```

If a variable is not found, leave it as-is (don't blank it out) — this helps users spot missing data.

### Default templates

Pre-fill these in the campaign creation form based on the selected channel. Let the user edit them.

```ts
export const DEFAULT_TEMPLATES = {
  email: {
    reminder: `Dear {{debtor_name}},\n\nThis is a reminder that your account balance of ${{amount}} is overdue. Please contact us at your earliest convenience to discuss payment options.\n\nYour reference number: {{reference}}\n\nThank you for your attention to this matter.`,
    settlement: `Dear {{debtor_name}},\n\nWe would like to offer you an opportunity to resolve your outstanding balance of ${{amount}} with a reduced settlement. Please contact us before the end of the month to take advantage of this offer.\n\nReference: {{reference}}`,
  },
  sms: {
    reminder: `[DebtFlow] Hi {{debtor_name}}, your balance of ${{amount}} (ref: {{reference}}) is overdue. Please call us or visit our portal to arrange payment.`,
    urgent: `[DebtFlow] URGENT: ${{amount}} outstanding on account {{reference}}. Contact us today to avoid further action.`,
  },
}
```

---

## Send Logic (`lib/campaign.ts`)

This function is the heart of the campaign feature. It queries the right debtors, creates all communication records in one batch, and updates the campaign status. Implement it exactly as described — the batch insert is important for performance with large debtor portfolios.

```ts
import { SupabaseClient } from '@supabase/supabase-js'
import { interpolateTemplate } from './campaign'

export async function sendCampaign(
  supabase: SupabaseClient,
  campaignId: string
): Promise<{ sent: number }> {
  // 1. Load the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) throw new Error('Campaign not found')
  if (campaign.status !== 'draft') throw new Error('Campaign has already been sent')

  // 2. Query the target segment
  let query = supabase
    .from('debtors')
    .select('id, full_name, outstanding_amount, reference_number')
    .eq('org_id', campaign.org_id)

  switch (campaign.target_segment) {
    case 'overdue_30': query = query.gte('days_overdue', 30); break
    case 'overdue_60': query = query.gte('days_overdue', 60); break
    case 'overdue_90': query = query.gte('days_overdue', 90); break
    case 'in_payment_plan': query = query.eq('status', 'in_payment_plan'); break
    // 'all' — no additional filter
  }

  const { data: debtors, error: debtorError } = await query
  if (debtorError) throw new Error('Failed to fetch debtors')
  if (!debtors || debtors.length === 0) throw new Error('No debtors match this segment')

  // 3. Create one communication record per debtor (batch insert)
  const now = new Date().toISOString()
  const comms = debtors.map(d => ({
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

  // 4. Create campaign_debtors join records (for per-debtor status tracking)
  const campaignDebtors = debtors.map(d => ({
    campaign_id: campaign.id,
    debtor_id: d.id,
    status: 'sent',
    sent_at: now,
  }))
  await supabase.from('campaign_debtors').insert(campaignDebtors)

  // 5. Update campaign: mark active, record sent count
  await supabase.from('campaigns').update({
    status: 'completed',
    sent_count: debtors.length,
  }).eq('id', campaign.id)

  return { sent: debtors.length }
}
```

---

## API Route (`app/api/campaigns/send/route.ts`)

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sendCampaign } from '@/lib/campaign'

export async function POST(req: NextRequest) {
  const { campaign_id } = await req.json()
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })

  const supabase = createServerClient()

  // Verify user is authenticated (RLS handles org isolation)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await sendCampaign(supabase, campaign_id)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
```

---

## Campaign Card Component

Render each campaign as a card in the list view, not a table row. Cards show more information at a glance and communicate status visually.

```tsx
const CHANNEL_LABEL = { sms: 'SMS', email: 'Email', call: 'Phone Call' }
const SEGMENT_LABEL = {
  all: 'All debtors', overdue_30: '30+ days overdue',
  overdue_60: '60+ days overdue', overdue_90: '90+ days overdue',
  in_payment_plan: 'In payment plan',
}
const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
}

export function CampaignCard({ campaign, onSend }: { campaign: Campaign; onSend: () => void }) {
  const responseRate = campaign.sent_count > 0
    ? ((campaign.response_count / campaign.sent_count) * 100).toFixed(0)
    : '0'

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{campaign.name}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {CHANNEL_LABEL[campaign.channel as keyof typeof CHANNEL_LABEL]} ·{' '}
              {SEGMENT_LABEL[campaign.target_segment as keyof typeof SEGMENT_LABEL]}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLE[campaign.status as keyof typeof STATUS_STYLE]}`}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t text-center">
          <div>
            <p className="text-xl font-bold text-gray-900">{campaign.sent_count}</p>
            <p className="text-xs text-gray-500">Sent</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{campaign.response_count}</p>
            <p className="text-xs text-gray-500">Responded</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{responseRate}%</p>
            <p className="text-xs text-gray-500">Rate</p>
          </div>
        </div>

        {campaign.status === 'draft' && (
          <Button className="w-full mt-4" size="sm" onClick={onSend}>
            Send Campaign
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Sending Flow (UX)

When a user clicks "Send Campaign" on a draft campaign:

1. Show a confirmation dialog: "Send this campaign to {N} matching debtors?" with a Cancel and Confirm button
2. On Confirm: call `POST /api/campaigns/send` with the campaign ID
3. While waiting: show a loading state on the button ("Sending...")
4. On success: show a toast "Campaign sent to {N} debtors", refresh the campaign card
5. On error: show the error message in the dialog, do not close it

This confirmation step is important — sending to the wrong segment can't be undone.