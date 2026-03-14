'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { supabase } from '@/lib/supabase/client'
import type { Tables } from '@/lib/types'

export function CampaignsList({
  campaigns,
  orgId,
  canManage,
}: {
  campaigns: Tables<'campaigns'>[]
  orgId: string
  canManage: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [matchingCount, setMatchingCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const [countError, setCountError] = useState<string | null>(null)
  const current = campaigns.find((c) => c.id === confirmId) || null

  async function openSendConfirm(campaign: Tables<'campaigns'>) {
    if (!canManage) return

    setConfirmId(campaign.id)
    setCountLoading(true)
    setCountError(null)
    setMatchingCount(null)

    let query = supabase.from('debtors').select('*', { count: 'exact', head: true }).eq('org_id', campaign.org_id)

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
      case 'all':
      default:
        break
    }

    const { count, error } = await query
    setCountLoading(false)

    if (error) {
      setCountError('Unable to check matching debtors.')
      return
    }
    setMatchingCount(count ?? 0)
  }

  async function sendCampaign() {
    if (!canManage) return
    if (!confirmId || countLoading || matchingCount === 0 || countError) return
    setSending(true)
    const res = await fetch('/api/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: confirmId }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) {
      toast({ title: 'Send failed', description: data.error || 'Unable to send campaign.' })
      return
    }
    setMatchingCount(null)
    setCountError(null)
    setConfirmId(null)
    toast({ title: 'Campaign sent', description: `Sent to ${data.sent} debtors.` })
    router.refresh()
  }

  async function createCampaignSuccess() {
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Launch outreach to overdue segments.</p>
        </div>
        {canManage ? (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="w-full sm:w-auto">Create campaign</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>New campaign</SheetTitle>
              </SheetHeader>
              <CampaignForm onCreated={createCampaignSuccess} orgId={orgId} />
            </SheetContent>
          </Sheet>
        ) : (
          <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
            Viewer access is read-only.
          </div>
        )}
      </div>

      {campaigns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onSend={() => openSendConfirm(campaign)}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-gray-500">No campaigns yet.</Card>
      )}

      <Dialog
        open={confirmId !== null}
        onOpenChange={(v) => {
          if (!v) {
            setConfirmId(null)
            setMatchingCount(null)
            setCountError(null)
            setCountLoading(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send this campaign?</DialogTitle>
          </DialogHeader>
          {countLoading ? (
            <p className="text-sm text-gray-500">Checking matching debtors...</p>
          ) : (
            <p className="text-sm text-gray-500">
              Send {current?.name ? `"${current.name}"` : 'this campaign'} to {matchingCount ?? 0} matching debtors? This cannot be undone.
            </p>
          )}
          {countError && <p className="text-sm text-red-600">{countError}</p>}
          {!countLoading && !countError && matchingCount === 0 && (
            <p className="text-sm text-amber-600">No debtors currently match this campaign segment.</p>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button
              onClick={sendCampaign}
              disabled={!canManage || countLoading || matchingCount === 0 || !!countError}
              loading={sending}
            >
              Confirm send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
