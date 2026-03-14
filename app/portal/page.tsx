import { DebtorLookup } from '@/components/portal/DebtorLookup'
import Link from 'next/link'
import { ArrowLeft, Search, Eye, CreditCard, ShieldCheck, TrendingUp } from 'lucide-react'

const STEPS = [
  {
    icon: Search,
    label: 'Lookup',
    desc: 'Find your account instantly with your email and reference number.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Eye,
    label: 'Visibility',
    desc: 'See your balance, status, and full payment history in one place.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: CreditCard,
    label: 'Repayment',
    desc: 'Complete payment in a clear, guided checkout flow.',
    color: 'bg-emerald-50 text-emerald-600',
  },
]

export default function PortalPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bg-slate-50"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* ── Top nav bar ──────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              DebtFlow<span className="text-blue-600">Pro</span>
            </span>
          </div>

          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Borrower Portal
          </span>
        </div>
      </header>

      {/* ── Info banner: no traditional login required ───────────────────── */}
      <div className="border-b border-blue-100 bg-blue-50 px-4 py-2.5 text-center sm:px-6">
        <p className="text-xs text-blue-700">
          <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 align-middle" />
          No password needed — your email and reference number are your secure access credentials.
          Your session is preserved for this browser tab.
        </p>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-10 lg:py-16">
        <div className="grid min-w-0 grid-cols-1 items-start gap-6 sm:gap-8 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)]">

          {/* Left — info panel (on mobile appears below the form) */}
          <div className="order-2 min-w-0 space-y-6 sm:space-y-8 xl:order-1 xl:sticky xl:top-8">

            {/* Headline block */}
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 sm:mb-5 sm:px-3.5 sm:text-xs sm:tracking-widest">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Secure Self-Service
              </div>
              <h1 className="mb-4 text-2xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-3xl xl:text-5xl">
                Review your balance.<br />
                <span className="text-blue-600">Repay on your terms.</span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base xl:text-lg">
                Use your email and reference number to access your account, check payment plan
                progress, and complete repayment — all in one clear flow.
              </p>
            </div>

            {/* How it works steps */}
            <div className="space-y-3">
              {STEPS.map(({ icon: Icon, label, desc, color }, i) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:gap-4 sm:p-5"
                >
                  <div className={`rounded-xl ${color} p-2.5 shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">0{i + 1}</span>
                      <span className="text-sm font-bold text-slate-900">{label}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust callout */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 sm:p-6">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-blue-600/10 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-violet-600/10 translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    No password required
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                  Your email and reference number together act as your secure two-factor identity.
                  Your session automatically expires when the browser tab closes — keeping your
                  account data safe.
                </p>
              </div>
            </div>
          </div>

          {/* Right — lookup form / account dashboard (on mobile appears first) */}
          <div className="order-1 min-w-0 xl:order-2">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 sm:px-6 sm:py-5">
                <h2 className="text-white font-bold text-base sm:text-lg">Access Your Account</h2>
                <p className="mt-0.5 text-sm text-blue-100">Enter your details to get started</p>
              </div>
              <div className="p-4 sm:p-6">
                <DebtorLookup />
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="min-w-0 text-xs text-slate-500">
                  Your information is secure and encrypted
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
