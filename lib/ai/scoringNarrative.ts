import 'server-only'

import type { DebtorInput, RiskScore } from '@/lib/scoring'

const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_OPENAI_MODEL = 'gpt-5-mini'
const REQUEST_TIMEOUT_MS = 8000
const MAX_SUMMARY_LENGTH = 320

export interface ScoringNarrativeInput {
  debtor: DebtorInput
  score: RiskScore
}

export interface OpenAiNarrativeResult {
  aiSummary: string
  aiSource: 'openai'
  aiModel: string
}

export interface DeterministicNarrativeResult {
  aiSummary: null
  aiSource: 'deterministic'
  aiModel: null
  reason:
    | 'missing_api_key'
    | 'request_failed'
    | 'invalid_response'
    | 'empty_response'
    | 'timeout'
    | 'parse_error'
}

export type ScoringNarrativeResult = OpenAiNarrativeResult | DeterministicNarrativeResult

interface OpenAiResponsesApiResponse {
  output_text?: string
  error?: {
    message?: string
  }
  output?: Array<{
    content?: Array<
      | {
          type?: 'output_text'
          text?: string
        }
      | {
          type?: 'text'
          text?: string
        }
    >
  }>
}

export async function generateScoringNarrative(
  input: ScoringNarrativeInput
): Promise<ScoringNarrativeResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'missing_api_key' }
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
  const prompt = buildPrompt(input)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  'You are an assistant for debt recovery collectors. Return concise JSON only. Do not change the provided score or label. Do not make legal threats, compliance claims, or mention actions that are not present in the supplied data.',
              },
            ],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'collector_risk_narrative',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                summary: {
                  type: 'string',
                  description:
                    'A 1-2 sentence collector-facing summary that explains the risk and immediate next step.',
                },
              },
              required: ['summary'],
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('OpenAI scoring narrative request failed:', errorText)
      return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'request_failed' }
    }

    const payload = (await response.json()) as OpenAiResponsesApiResponse
    const rawText = extractOutputText(payload)
    if (!rawText) {
      return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'empty_response' }
    }

    try {
      const parsed = JSON.parse(rawText) as { summary?: unknown }
      const aiSummary = sanitizeSummary(parsed.summary)
      if (!aiSummary) {
        return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'invalid_response' }
      }

      return {
        aiSummary,
        aiSource: 'openai',
        aiModel: model,
      }
    } catch (error) {
      console.warn('Failed to parse OpenAI scoring narrative response:', error)
      return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'parse_error' }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('OpenAI scoring narrative request timed out.')
      return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'timeout' }
    }

    console.warn('OpenAI scoring narrative request error:', error)
    return { aiSummary: null, aiSource: 'deterministic', aiModel: null, reason: 'request_failed' }
  } finally {
    clearTimeout(timeoutId)
  }
}

function buildPrompt({ debtor, score }: ScoringNarrativeInput) {
  return [
    'Create a short collector-facing risk summary for this debtor.',
    'Keep it under 2 sentences.',
    'Use only the facts below and stay consistent with the deterministic score.',
    '',
    `Score: ${score.score}/100`,
    `Risk label: ${score.risk_label}`,
    `Recommended action: ${score.recommended_action}`,
    `Best contact channel: ${score.best_contact_channel}`,
    `Best contact time: ${score.best_contact_time}`,
    `Days overdue: ${debtor.days_overdue}`,
    `Outstanding amount: ${formatUsd(debtor.outstanding_amount)}`,
    `Total owed: ${formatUsd(debtor.total_owed)}`,
    `Contact attempts: ${debtor.contact_attempts}`,
    `Failed payments: ${debtor.failed_payments}`,
    '',
    'Explain the main risk drivers and reinforce the immediate next step for the collector.',
  ].join('\n')
}

function extractOutputText(payload: OpenAiResponsesApiResponse) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  const contentText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => ('text' in part ? part.text : undefined))
    .find((text) => typeof text === 'string' && text.trim())

  return contentText ?? null
}

function sanitizeSummary(value: unknown) {
  if (typeof value !== 'string') return null

  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return null

  return normalized.slice(0, MAX_SUMMARY_LENGTH)
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
