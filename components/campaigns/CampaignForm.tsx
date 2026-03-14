'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DEFAULT_TEMPLATES } from '@/lib/campaign'
import { supabase } from '@/lib/supabase/client'

const TEMPLATE_OPTIONS = {
  email: [
    { label: 'Reminder', value: DEFAULT_TEMPLATES.email.reminder },
    { label: 'Settlement Offer', value: DEFAULT_TEMPLATES.email.settlement },
  ],
  sms: [
    { label: 'Reminder', value: DEFAULT_TEMPLATES.sms.reminder },
    { label: 'Urgent Notice', value: DEFAULT_TEMPLATES.sms.urgent },
  ],
} as const

export function CampaignForm({ onCreated, orgId }: { onCreated: () => void; orgId: string }) {
  const [name, setName] = useState('')
  const [segment, setSegment] = useState<'all' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'in_payment_plan'>('overdue_30')
  const [channel, setChannel] = useState<'sms' | 'email'>('email')
  const [template, setTemplate] = useState<string>(DEFAULT_TEMPLATES.email.reminder)
  const [templatePreset, setTemplatePreset] = useState<'Reminder' | 'Settlement Offer' | 'Urgent Notice'>('Reminder')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Campaign name is required.')
      return
    }
    if (!orgId) {
      setError('Organization not found for this user.')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('campaigns').insert({
      org_id: orgId,
      name,
      status: 'draft',
      target_segment: segment,
      channel,
      message_template: template,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    onCreated()
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="text-sm font-medium text-gray-700">Campaign name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="March settlement push" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Target segment</label>
        <Select value={segment} onChange={(e) => setSegment(e.target.value as typeof segment)}>
          <option value="all">All debtors</option>
          <option value="overdue_30">30+ days overdue</option>
          <option value="overdue_60">60+ days overdue</option>
          <option value="overdue_90">90+ days overdue</option>
          <option value="in_payment_plan">In payment plan</option>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Channel</label>
        <Select
          value={channel}
          onChange={(e) => {
            const nextChannel = e.target.value as typeof channel
            setChannel(nextChannel)
            setTemplatePreset('Reminder')
            setTemplate(nextChannel === 'email' ? DEFAULT_TEMPLATES.email.reminder : DEFAULT_TEMPLATES.sms.reminder)
          }}
        >
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Template library</label>
        <Select
          value={templatePreset}
          onChange={(e) => {
            const nextPreset = e.target.value as typeof templatePreset
            setTemplatePreset(nextPreset)
            const selectedTemplate = TEMPLATE_OPTIONS[channel].find((option) => option.label === nextPreset)
            if (selectedTemplate) {
              setTemplate(selectedTemplate.value)
            }
          }}
        >
          {TEMPLATE_OPTIONS[channel].map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Message template</label>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10"
          rows={6}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Use variables: {'{{debtor_name}}'}, {'{{amount}}'}, {'{{reference}}'}
        </p>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700">Schedule (optional)</label>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" loading={loading}>
        Create campaign
      </Button>
    </form>
  )
}
