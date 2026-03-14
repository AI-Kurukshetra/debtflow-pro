'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RiskScoreBadge } from '@/components/debtors/RiskScoreBadge'
import { formatDateTime } from '@/lib/utils'
import type { Tables } from '@/lib/types'

const CHANNEL_LABEL = { call: 'Phone call', email: 'Email', sms: 'SMS' } as const

export function AIInsightCard({
  debtor,
  onRefresh,
  canManage,
}: {
  debtor: Tables<'debtors'>
  onRefresh: () => void
  canManage: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reanalyze() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debtor_id: debtor.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to re-analyze.')
      setLoading(false)
      return
    }
    setLoading(false)
    onRefresh()
  }

  return (
    <Card className="border-sky-100 bg-sky-50/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">AI Risk Assessment</CardTitle>
          {canManage ? (
            <Button variant="ghost" size="sm" onClick={reanalyze} loading={loading} className="text-xs">
              Re-analyze
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {debtor.risk_label && debtor.risk_score !== null ? (
          <>
            <RiskScoreBadge score={debtor.risk_score} label={debtor.risk_label} size="lg" />
            <p className="text-sm text-gray-500">{debtor.recommended_action}</p>
            {debtor.ai_summary ? (
              <div className="rounded-md border border-sky-100 bg-white/80 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">AI narrative</p>
                <p className="mt-1 text-sm text-gray-600">{debtor.ai_summary}</p>
              </div>
            ) : null}
            {debtor.best_contact_channel && (
              <p className="text-sm text-gray-500">
                Best channel: <strong>{CHANNEL_LABEL[debtor.best_contact_channel]}</strong>
              </p>
            )}
            {debtor.ai_source === 'deterministic' ? (
              <p className="text-xs text-gray-400">
                Advanced AI insight was unavailable, so this analysis is using the built-in deterministic recovery logic.
              </p>
            ) : null}
            {debtor.ai_source === 'openai' && debtor.ai_model ? (
              <p className="text-xs text-gray-400">Narrative generated with {debtor.ai_model}.</p>
            ) : null}
            {debtor.ai_analyzed_at && (
              <p className="text-xs text-gray-400">Last analyzed: {formatDateTime(debtor.ai_analyzed_at)}</p>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">No risk analysis yet</p>
            {canManage ? (
              <Button size="sm" onClick={reanalyze} loading={loading}>
                Run AI Analysis
              </Button>
            ) : (
              <p className="text-xs text-gray-400">Viewer access can review results, but not rerun scoring.</p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
