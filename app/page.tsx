'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Layers3,
  MessageSquareMore,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'

const STATS = [
  { value: '$2.84M', label: 'Portfolio tracked', trend: '+14.8%' },
  { value: '94%', label: 'Recovery rate', trend: '+6.2%' },
  { value: '23', label: 'High-risk accounts', trend: 'Action needed' },
  { value: '48h', label: 'Avg. response time', trend: '-31%' },
]

const METHOD_CARDS = [
  {
    icon: CircleDollarSign,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Portfolio Prioritization',
    description: 'Identify high-balance and high-risk debtors first so collectors spend time where recovery impact is highest.',
    points: ['Risk bands by debtor', 'Clear next-step recommendations'],
  },
  {
    icon: MessageSquareMore,
    color: 'from-violet-500 to-violet-600',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    title: 'Outreach Orchestration',
    description: 'Run reminder campaigns, log communication outcomes, and keep campaign sends visible for your team.',
    points: ['Bulk campaign actions', 'Per-debtor communication history'],
  },
  {
    icon: ShieldCheck,
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Trust-First Self Service',
    description: 'Give debtors a clean portal that feels real, lowers friction, and supports payment-plan conversations.',
    points: ['Reference-based lookup', 'Self-service payment recording'],
  },
]

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Recovery Intelligence Dashboard',
    description: 'Show balances, overdue segments, campaign performance, and repayment progress in a layout that looks credible at first glance.',
    tag: 'Analytics',
    tagColor: 'bg-blue-100 text-blue-700',
  },
  {
    icon: Layers3,
    title: 'Seamless Workflow Clarity',
    description: 'The homepage, dashboard, and portal are aligned so you can move from landing to dashboard to portal without friction.',
    tag: 'Workflow',
    tagColor: 'bg-violet-100 text-violet-700',
  },
  {
    icon: FileCheck2,
    title: 'Launch-Ready Setup',
    description: 'Pre-loaded accounts, visible metrics, and clear product sections so you can present a polished, launch-ready platform.',
    tag: 'Setup',
    tagColor: 'bg-emerald-100 text-emerald-700',
  },
]

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY
      setIsScrolled((prev) => (y > 20 ? true : y < 5 ? false : prev))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Nav */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${isScrolled ? 'border-slate-200 bg-white/90 backdrop-blur-md shadow-sm' : 'border-transparent bg-transparent'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">DebtFlow<span className="text-blue-600">Pro</span></span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-slate-900 transition-colors">Workflow</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/portal" className="hidden sm:inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all">
              Debtor Portal
            </Link>
            <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-[0_2px_8px_rgba(37,99,235,0.35)]">
              Collector Login
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-blue-50 opacity-70 blur-3xl translate-x-1/3 -translate-y-1/4" />
            <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-50 opacity-60 blur-3xl -translate-x-1/4 translate-y-1/4" />
          </div>

          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 mb-6">
                  <BadgeCheck className="h-4 w-4" />
                  AI-Powered Recovery OS
                </div>

                <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight text-slate-900 mb-6">
                  Recover debt{' '}
                  <span className="relative">
                    <span className="relative z-10 text-blue-600">smarter,</span>
                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none">
                      <path d="M0,6 Q50,0 100,5 Q150,10 200,4" stroke="#BFDBFE" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    </svg>
                  </span>
                  {' '}faster, better.
                </h1>

                <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
                  DebtFlow Pro helps lender teams manage debtors, run campaigns, track payments, and demonstrate a complete recovery workflow in one polished platform.
                </p>

                <div className="flex flex-wrap gap-3 mb-10">
                  <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-base font-semibold text-white hover:bg-blue-700 transition-colors shadow-[0_4px_16px_rgba(37,99,235,0.4)]">
                    Open Dashboard
                  </Link>
                  <Link href="/portal" className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all">
                    Try Debtor Portal
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                  {['Deterministic risk scoring', 'No third-party APIs', 'Mobile-friendly portal'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Dashboard Card */}
              <div className="relative">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 overflow-hidden">
                  {/* Card header */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Operations Snapshot</p>
                      <h2 className="text-white font-semibold text-lg mt-0.5">Recovery Command Center</h2>
                    </div>
                    <span className="rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-medium px-3 py-1.5 border border-emerald-400/20">
                      Live
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100">
                    {STATS.map(({ value, label, trend }) => (
                      <div key={label} className="bg-white px-5 py-4">
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                        <p className="text-xs font-medium text-emerald-600 mt-1">{trend}</p>
                      </div>
                    ))}
                  </div>

                  {/* Activity */}
                  <div className="p-5 space-y-3">
                    {[
                      { icon: Users, title: 'High-risk segment', desc: '23 accounts require collector follow-up', color: 'text-red-500', bg: 'bg-red-50' },
                      { icon: MessageSquareMore, title: 'Campaign activity', desc: 'Reminders and payment-plan nudges active', color: 'text-blue-500', bg: 'bg-blue-50' },
                      { icon: ShieldCheck, title: 'Portal readiness', desc: 'Public self-service journey ready for borrowers', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    ].map(({ icon: Icon, title, desc, color, bg }) => (
                      <div key={title} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                        <div className={`rounded-lg ${bg} p-2 shrink-0`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CTA strip */}
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-end">
                    <Link href="/login" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                      Open full dashboard
                    </Link>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 hidden lg:flex items-center gap-2 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Recovery rate</p>
                    <p className="text-sm font-bold text-slate-900">+14.8% this month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Core workflows */}
        <section id="workflow" className="py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-3">Core Workflows</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Built around what matters most in debt recovery</h2>
              <p className="text-lg text-slate-600">Clear sections, direct copy, and structured product cards make the story easier to understand.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {METHOD_CARDS.map(({ icon: Icon, bg, iconColor, title, description, points }) => (
                <div key={title} className="group rounded-2xl bg-white border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-300 hover:-translate-y-1">
                  <div className={`inline-flex rounded-2xl ${bg} p-3.5 mb-5`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 mb-5">{description}</p>
                  <div className="space-y-2.5 pt-4 border-t border-slate-100">
                    {points.map((point) => (
                      <div key={point} className="flex items-center gap-2.5 text-sm text-slate-700">
                        <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-blue-600" />
                        </div>
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-2xl mb-14">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Everything You Need</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">A cleaner structure, more believable product framing.</h2>
            </div>

            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, title, description, tag, tagColor }) => (
                <div key={title} className="group flex flex-col sm:flex-row gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                  <div className="shrink-0">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                      <Icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 flex-wrap mb-2">
                      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tagColor}`}>{tag}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col items-center justify-center gap-1">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} DebtFlow Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}