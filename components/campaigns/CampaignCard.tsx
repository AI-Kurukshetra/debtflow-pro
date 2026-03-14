import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import type { Tables } from '@/lib/types'

const CHANNEL_LABEL = { sms: 'SMS', email: 'Email', call: 'Phone Call' } as const
const SEGMENT_LABEL = {
  all: 'All debtors',
  overdue_30: '30+ days overdue',
  overdue_60: '60+ days overdue',
  overdue_90: '90+ days overdue',
  in_payment_plan: 'In payment plan',
} as const
const STATUS_STYLE = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
} as const

export function CampaignCard({
  campaign,
  onSend,
  canManage,
}: {
  campaign: Tables<'campaigns'>
  onSend: () => void
  canManage: boolean
}) {
  const responseRate = campaign.sent_count > 0 ? ((campaign.response_count / campaign.sent_count) * 100).toFixed(0) : '0'

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 leading-tight">{campaign.name}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {CHANNEL_LABEL[campaign.channel as keyof typeof CHANNEL_LABEL]} -{' '}
              {SEGMENT_LABEL[campaign.target_segment as keyof typeof SEGMENT_LABEL]}
            </p>
          </div>
          <span className={cn(
            'shrink-0 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            STATUS_STYLE[campaign.status as keyof typeof STATUS_STYLE] || 'bg-gray-100 text-gray-800'
          )}>
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

        {campaign.status === 'draft' && canManage && (
          <Button className="w-full mt-4" size="sm" onClick={onSend}>
            Send Campaign
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
