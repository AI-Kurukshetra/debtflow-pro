'use client'

import { useState } from 'react'
import { CheckCircle2, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/debtors/StatusBadge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { PortalAccountSummary, PortalLookupRequest, PortalPaymentRequest, Tables } from '@/lib/types'

type PortalDebtor = Pick<
  Tables<'debtors'>,
  'id' | 'org_id' | 'full_name' | 'email' | 'reference_number' | 'outstanding_amount' | 'status'
>

type PortalPaymentHistoryItem = Pick<
  Tables<'payments'>,
  'id' | 'amount' | 'payment_date' | 'method' | 'status' | 'created_at'
>

type PortalPlan = NonNullable<PortalAccountSummary['plan']>
type PortalInstallment = PortalPlan['installments'][number]

const INSTALLMENT_STATUS_LABEL: Record<PortalInstallment['status'], string> = {
  upcoming: 'Upcoming',
  paid: 'Paid',
  overdue: 'Overdue',
  skipped: 'Skipped',
}

const INSTALLMENT_STATUS_CLASS: Record<PortalInstallment['status'], string> = {
  upcoming: 'bg-slate-100 text-slate-600',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-rose-100 text-rose-700',
  skipped: 'bg-amber-100 text-amber-700',
}

/** Luhn (mod 10) check for card number validity */
function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let isEven = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (isEven) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    isEven = !isEven
  }
  return sum % 10 === 0
}

function validateExpiry(expiry: string): string | null {
  if (!expiry || expiry.length !== 5) return 'Enter expiry in MM/YY format.'
  const [mm, yy] = expiry.split('/').map((s) => s.trim())
  const month = parseInt(mm, 10)
  const year = parseInt(yy, 10)
  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) return 'Enter a valid expiry date (MM/YY).'
  const now = new Date()
  const currentYear = now.getFullYear() % 100
  const currentMonth = now.getMonth() + 1
  if (year < currentYear || (year === currentYear && month < currentMonth)) return 'Card has expired.'
  return null
}

function validateCVV(cvv: string, cardNumber: string): string | null {
  const digits = cvv.replace(/\D/g, '')
  const firstDigit = cardNumber.replace(/\D/g, '').charAt(0)
  const isAmex = firstDigit === '3'
  if (isAmex) return digits.length === 4 ? null : 'Amex requires a 4-digit CVV.'
  return digits.length === 3 ? null : 'Enter a 3-digit CVV.'
}

function validateCardholderName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < 2) return 'Enter the full name as it appears on the card.'
  if (!/^[\p{L}\p{M}\s\-'.]+$/u.test(trimmed)) return 'Cardholder name can only contain letters, spaces, and hyphens.'
  return null
}

type CardFieldErrors = {
  cardholderName?: string
  cardNumber?: string
  expiry?: string
  cvv?: string
}

export function DebtorLookup() {
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [debtor, setDebtor] = useState<PortalDebtor | null>(null)
  const [plan, setPlan] = useState<PortalPlan | null>(null)
  const [payments, setPayments] = useState<PortalPaymentHistoryItem[]>([])
  const [amount, setAmount] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardErrors, setCardErrors] = useState<CardFieldErrors>({})
  const [success, setSuccess] = useState(false)
  const [paymentReceipt, setPaymentReceipt] = useState<{
    amount: number
    paidAt: string
    methodLabel: string
  } | null>(null)

  function resetPaymentForm() {
    setAmount('')
    setCardholderName('')
    setCardNumber('')
    setExpiry('')
    setCvv('')
    setCardErrors({})
  }

  function formatCardNumber(value: string) {
    return value
      .replace(/\D/g, '')
      .slice(0, 19)
      .replace(/(\d{4})(?=\d)/g, '$1 ')
      .trim()
  }

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length < 3) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const maskedCard = cardNumber
    ? cardNumber.padEnd(19, '•')
    : '4242 4242 4242 4242'
  const cardDisplayName = cardholderName.trim() || 'CARDHOLDER NAME'

  async function lookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setDebtor(null)
    setPlan(null)
    setPayments([])
    setPaymentReceipt(null)
    setLoading(true)

    const payload: PortalLookupRequest = { email, reference_number: reference }
    const response = await fetch('/api/portal/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = (await response.json()) as PortalAccountSummary & { error?: string }

    setLoading(false)

    if (!response.ok || !result.debtor) {
      setError(result.error ?? 'No account found. Check your email and reference number.')
      return
    }

    setDebtor(result.debtor as PortalDebtor)
    setPlan(result.plan ?? null)
    setPayments(result.payments ?? [])
  }

  async function makePayment() {
    if (!debtor) return

    setError(null)
    const amt = Number(amount)

    if (!amt || amt <= 0) {
      setError('Enter a valid payment amount.')
      return
    }

    if (amt > Number(debtor.outstanding_amount)) {
      setError('Payment amount cannot exceed the outstanding balance.')
      return
    }

    const rawCard = cardNumber.replace(/\s/g, '')
    const errs: CardFieldErrors = {}
    const nameErr = validateCardholderName(cardholderName)
    if (nameErr) errs.cardholderName = nameErr
    if (rawCard.length < 13 || rawCard.length > 19) errs.cardNumber = 'Card number must be 13–19 digits.'
    else if (!luhnCheck(cardNumber)) errs.cardNumber = 'Card number is invalid.'
    const expiryErr = validateExpiry(expiry)
    if (expiryErr) errs.expiry = expiryErr
    const cvvErr = validateCVV(cvv, cardNumber)
    if (cvvErr) errs.cvv = cvvErr

    if (Object.keys(errs).length > 0) {
      setCardErrors(errs)
      setError(Object.values(errs)[0] ?? 'Please correct the card details.')
      return
    }
    setCardErrors({})

    setLoading(true)
    const payload: PortalPaymentRequest = {
      email: debtor.email ?? email,
      reference_number: debtor.reference_number,
      amount: amt,
    }
    const response = await fetch('/api/portal/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = (await response.json()) as {
      payment_id?: string
      error?: string
      outstanding_amount?: number
      status?: PortalDebtor['status']
      plan?: PortalAccountSummary['plan']
    }

    if (!response.ok || typeof result.outstanding_amount !== 'number' || !result.status) {
      setLoading(false)
      setError(result.error ?? 'Failed to process payment.')
      return
    }

    setLoading(false)
    setSuccess(true)
    setPaymentReceipt({
      amount: amt,
      paidAt: new Date().toISOString(),
      methodLabel: 'Card',
    })
    resetPaymentForm()
    setDebtor({ ...debtor, outstanding_amount: result.outstanding_amount, status: result.status })
    setPlan(result.plan ?? null)
    setPayments((current) => [
      {
        id: result.payment_id ?? `${Date.now()}`,
        amount: amt,
        payment_date: new Date().toISOString().split('T')[0],
        method: 'card',
        status: 'completed',
        created_at: new Date().toISOString(),
      },
      ...current,
    ])
  }

  if (success && debtor) {
    return (
      <Card className="w-full min-w-0 border-emerald-100 bg-white/95 shadow-[0_16px_48px_rgba(15,23,42,0.12)]">
        <CardContent className="p-4 sm:p-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Payment Approved</div>
            <p className="mt-2 text-sm text-gray-600">
              Your payment has been applied successfully. Updated balance:
              <span className="ml-1 font-semibold text-gray-900">
                {formatCurrency(Number(debtor.outstanding_amount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-3 text-sm">
              <span className="text-gray-500">Reference</span>
              <span className="font-medium text-gray-900">{debtor.reference_number}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-gray-500">Amount paid</span>
              <span className="font-semibold text-gray-900">
                {paymentReceipt ? formatCurrency(paymentReceipt.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-gray-200 py-3 text-sm">
              <span className="text-gray-500">Method</span>
              <span className="font-medium text-gray-900">{paymentReceipt?.methodLabel ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 text-sm">
              <span className="text-gray-500">Paid at</span>
              <span className="font-medium text-gray-900">
                {paymentReceipt ? formatDateTime(paymentReceipt.paidAt) : '-'}
              </span>
            </div>
          </div>

          <Button className="mt-4 w-full" onClick={() => setSuccess(false)}>
            Make another payment
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (debtor) {
    const balance = Number(debtor.outstanding_amount)
    const isSettled = balance <= 0
    const nextInstallment = plan?.installments.find((installment) => installment.status !== 'paid') ?? null
    const quickAmounts = [
      ...(nextInstallment
        ? [
            {
              label: 'Pay next installment',
              value: Number(nextInstallment.amount),
            },
          ]
        : []),
      { label: 'Pay $100', value: 100 },
      { label: 'Pay $250', value: 250 },
      { label: 'Pay 50%', value: Math.max(1, Math.round(balance / 2)) },
      { label: 'Pay in full', value: balance },
    ]

    return (
      <Card className="w-full min-w-0 overflow-hidden border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.92))] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Borrower account</div>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 sm:text-2xl">
                  Hello, {debtor.full_name?.trim() || 'there'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">Reference {debtor.reference_number}</p>
              </div>
              <div className="self-start rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <LockKeyhole className="mr-1 inline h-3.5 w-3.5" />
                Verified session
              </div>
            </div>
          </div>
          <div className="grid min-w-0 gap-4 p-4 sm:gap-6 sm:p-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
            <div className="min-w-0 space-y-4">
              <div className="min-w-0 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_38%,#0f766e_100%)] p-4 text-white shadow-sm sm:rounded-[28px] sm:p-5">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.2em] text-sky-100/80">Outstanding balance</div>
                    <div className="mt-2 text-xl font-semibold sm:text-2xl xl:text-3xl">
                      {formatCurrency(balance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="self-start rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                    Secure checkout
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1 text-xs text-sky-100/80 sm:flex-row sm:items-center sm:justify-between">
                  <span>Encrypted payment experience</span>
                  <span>PCI-style secure form</span>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Account status</div>
                  <div className="mt-2">
                    <StatusBadge status={debtor.status} />
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan status</div>
                  <div className="mt-2 text-sm text-gray-700">
                    {plan
                      ? `${plan.installments_paid} of ${plan.installments_total} installments paid`
                      : 'No payment plan on file'}
                  </div>
                </div>
              </div>

              {plan ? (
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Installment schedule</h3>
                      <p className="text-xs text-gray-500">
                        Review upcoming due dates and completed installments for your active plan.
                      </p>
                    </div>
                    <div className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                      {plan.installments_total} installments
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                      <span>Plan progress</span>
                      <span>
                        {plan.installments_paid} of {plan.installments_total} paid
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#0f766e_100%)] transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (plan.installments_paid / Math.max(plan.installments_total, 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    {plan.installments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                        No installment schedule is available yet.
                      </div>
                    ) : (
                      <div className="-mx-1 overflow-x-auto pb-2">
                        <div className="flex min-w-max gap-3 px-1 sm:min-w-full">
                          {plan.installments.map((installment, index) => (
                            <div
                              key={installment.id}
                              className="min-w-[200px] flex-1 shrink-0 rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm sm:min-w-[220px] sm:rounded-[24px]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Installment #{index + 1}
                                  </div>
                                  <div className="mt-2 text-lg font-semibold text-slate-900">
                                    {formatCurrency(Number(installment.amount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                    INSTALLMENT_STATUS_CLASS[installment.status]
                                  }`}
                                >
                                  {INSTALLMENT_STATUS_LABEL[installment.status]}
                                </span>
                              </div>

                              <div className="mt-5 space-y-3">
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Due date
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-slate-900">
                                    {formatDate(installment.due_date)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Status note
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {installment.paid_at
                                      ? `Paid on ${formatDateTime(installment.paid_at)}`
                                      : installment.status === 'overdue'
                                        ? 'This installment is overdue.'
                                        : installment.status === 'skipped'
                                          ? 'This installment was skipped.'
                                          : 'Awaiting payment'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">Recent payments</h3>
                      <p className="text-xs text-gray-500">Review your latest completed payments on this account.</p>
                    </div>
                  <div className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {payments.length} recorded
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {payments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                      No payments have been recorded on this account yet.
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {formatCurrency(Number(payment.amount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDateTime(payment.created_at ?? payment.payment_date)}
                          </div>
                        </div>
                        <div className="sm:text-right">
                          <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                            {payment.method.replace('_', ' ')}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">{payment.status}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-4 xl:sticky xl:top-6">
              {isSettled ? (
                <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)] p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Account settled</h3>
                      <p className="text-xs text-slate-500">
                        Your balance is fully paid. No further payment is required on this account.
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      Paid in full
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Outstanding balance</div>
                      <div className="mt-2 text-2xl font-semibold text-emerald-700">
                        {formatCurrency(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Latest status</div>
                      <div className="mt-2 text-sm text-slate-700">
                        This account is closed for payment and retained here for reference only.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">Payment details</h3>
                  <p className="text-xs text-gray-500">Complete your balance securely with the method below.</p>
                </div>
                <div className="self-start rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                  SSL secured
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment amount</label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[$,]/g, ''))}
                    placeholder="250.00"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickAmounts.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        className="min-h-[36px] rounded-full border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-sky-300 hover:bg-sky-50 active:bg-sky-100 sm:py-1"
                        onClick={() => setAmount(option.value.toFixed(2))}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">Credit or debit card</div>
                      <div className="text-xs text-slate-500">Instant approval</div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:rounded-[24px]">
                    <div className="min-w-0 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#111827_0%,#1e293b_55%,#3b82f6_100%)] p-3 text-white shadow-sm sm:rounded-[24px] sm:p-4">
                      <div className="flex min-w-0 items-center justify-between text-[10px] uppercase tracking-[0.1em] text-white/70 sm:tracking-[0.12em] sm:text-xs sm:tracking-[0.18em]">
                        <span className="truncate">Virtual card</span>
                        <span className="shrink-0">DebtFlow Pay</span>
                      </div>
                      <div className="mt-4 min-w-0 break-all text-sm font-medium tracking-[0.1em] sm:mt-7 sm:text-base sm:tracking-[0.12em] sm:text-lg sm:tracking-[0.24em]">
                        {maskedCard}
                      </div>
                      <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-3 sm:mt-5">
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase tracking-[0.1em] text-white/60 sm:tracking-[0.18em]">Cardholder</div>
                          <div className="mt-1 truncate text-sm font-medium">{cardDisplayName}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[10px] uppercase tracking-[0.1em] text-white/60 sm:tracking-[0.18em]">Expires</div>
                          <div className="mt-1 text-sm font-medium">{expiry || '08/28'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm font-medium text-slate-900">Card information</div>
                      <div className="text-xs text-slate-500">Visa · Mastercard · Amex</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cardholder name</label>
                      <Input
                        value={cardholderName}
                        onChange={(e) => {
                          setCardholderName(e.target.value)
                          if (cardErrors.cardholderName) setCardErrors((prev) => ({ ...prev, cardholderName: undefined }))
                        }}
                        placeholder="As shown on card"
                        className={`mt-1 ${cardErrors.cardholderName ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                        aria-invalid={!!cardErrors.cardholderName}
                        aria-describedby={cardErrors.cardholderName ? 'cardholder-name-error' : undefined}
                      />
                      {cardErrors.cardholderName && (
                        <p id="cardholder-name-error" className="mt-1 text-xs text-red-600">
                          {cardErrors.cardholderName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Card number</label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => {
                          setCardNumber(formatCardNumber(e.target.value))
                          if (cardErrors.cardNumber) setCardErrors((prev) => ({ ...prev, cardNumber: undefined }))
                        }}
                        placeholder="4242 4242 4242 4242"
                        inputMode="numeric"
                        maxLength={19}
                        className={`mt-1 ${cardErrors.cardNumber ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                        aria-invalid={!!cardErrors.cardNumber}
                        aria-describedby={cardErrors.cardNumber ? 'card-number-error' : undefined}
                      />
                      {cardErrors.cardNumber && (
                        <p id="card-number-error" className="mt-1 text-xs text-red-600">
                          {cardErrors.cardNumber}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Expiry</label>
                        <Input
                          value={expiry}
                          onChange={(e) => {
                            setExpiry(formatExpiry(e.target.value))
                            if (cardErrors.expiry) setCardErrors((prev) => ({ ...prev, expiry: undefined }))
                          }}
                          placeholder="MM/YY"
                          inputMode="numeric"
                          maxLength={5}
                          className={`mt-1 ${cardErrors.expiry ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                          aria-invalid={!!cardErrors.expiry}
                          aria-describedby={cardErrors.expiry ? 'expiry-error' : undefined}
                        />
                        {cardErrors.expiry && (
                          <p id="expiry-error" className="mt-1 text-xs text-red-600">
                            {cardErrors.expiry}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">CVV</label>
                        <Input
                          value={cvv}
                          onChange={(e) => {
                            setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))
                            if (cardErrors.cvv) setCardErrors((prev) => ({ ...prev, cvv: undefined }))
                          }}
                          placeholder="123"
                          inputMode="numeric"
                          maxLength={4}
                          className={`mt-1 ${cardErrors.cvv ? 'border-red-500 focus-visible:ring-red-500/20' : ''}`}
                          aria-invalid={!!cardErrors.cvv}
                          aria-describedby={cardErrors.cvv ? 'cvv-error' : undefined}
                        />
                        {cardErrors.cvv && (
                          <p id="cvv-error" className="mt-1 text-xs text-red-600">
                            {cardErrors.cvv}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              )}

              <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50/70 p-4 text-xs leading-6 text-gray-500">
                Payments are processed securely. Your balance and payment history update in real time.
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {!isSettled ? (
                <Button onClick={makePayment} disabled={loading} className="h-11 w-full text-sm font-semibold">
                  {loading ? 'Processing secure payment...' : 'Confirm payment'}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full min-w-0 overflow-hidden border-white/80 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
      <CardContent className="p-4 sm:p-6">
        <div className="min-w-0 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#0f766e_100%)] p-4 text-white sm:rounded-[24px] sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/65">Secure access</div>
              <h1 className="mt-2 text-2xl font-semibold">Account lookup</h1>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">Borrower portal</div>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/80">
            Enter your email and reference number to review your account and continue to payment.
          </p>
        </div>
        <form className="mt-6 space-y-4" onSubmit={lookup}>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Reference number</label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Enter your reference number" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Searching...' : 'Find my account'}
          </Button>
        </form>
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">Need help finding your account?</div>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Contact your lender and keep your exact reference number ready to speed up verification.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
