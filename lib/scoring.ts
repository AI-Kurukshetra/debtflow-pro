export interface DebtorInput {
  days_overdue: number
  outstanding_amount: number
  contact_attempts: number
  failed_payments: number
  total_owed: number
}

export interface RiskScore {
  score: number
  risk_label: 'low' | 'medium' | 'high' | 'critical'
  recommended_action: string
  best_contact_channel: 'sms' | 'email' | 'call'
  best_contact_time: string
}

export function scoreDebtor(input: DebtorInput): RiskScore {
  let score = 0

  if (input.days_overdue > 180) score += 40
  else if (input.days_overdue > 90) score += 30
  else if (input.days_overdue > 60) score += 20
  else if (input.days_overdue > 30) score += 10

  if (input.outstanding_amount > 50000) score += 25
  else if (input.outstanding_amount > 20000) score += 18
  else if (input.outstanding_amount > 10000) score += 12
  else if (input.outstanding_amount > 5000) score += 6

  if (input.contact_attempts > 10) score += 20
  else if (input.contact_attempts > 5) score += 12
  else if (input.contact_attempts > 2) score += 5

  score += Math.min(input.failed_payments * 5, 15)

  score = Math.min(Math.max(score, 0), 100)

  const risk_label =
    score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low'

  const best_contact_channel: RiskScore['best_contact_channel'] =
    input.days_overdue > 90 ? 'call' : input.days_overdue > 30 ? 'sms' : 'email'

  return {
    score,
    risk_label,
    recommended_action: getRecommendation(risk_label, input),
    best_contact_channel,
    best_contact_time: getContactTime(best_contact_channel),
  }
}

function getRecommendation(label: RiskScore['risk_label'], input: DebtorInput): string {
  const discount = input.outstanding_amount > 10000 ? '30%' : '20%'
  switch (label) {
    case 'critical':
      return 'Escalate to legal review immediately. Offer a one-time settlement at a significant discount as a last resort.'
    case 'high':
      return `Schedule a phone call within 24 hours. Offer a ${discount} settlement discount or a structured payment plan.`
    case 'medium':
      return 'Send an SMS payment reminder. Offer a flexible monthly payment plan.'
    case 'low':
      return 'Send a friendly email reminder. No urgent action required - monitor for changes.'
  }
}

function getContactTime(channel: RiskScore['best_contact_channel']): string {
  switch (channel) {
    case 'call':
      return 'Weekday mornings 9-11am or evenings 5-7pm'
    case 'sms':
      return 'Weekday afternoons 2-5pm'
    case 'email':
      return 'Any weekday business hours'
  }
}
