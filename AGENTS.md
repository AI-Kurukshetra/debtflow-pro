# DebtFlow Pro — Agent Instructions

You are building **DebtFlow Pro**, an AI-powered debt recovery SaaS platform for mid-market lenders and credit unions. It is a direct alternative to [Kredit](https://kredit.com).

Read this file completely before writing any code. It defines every architectural decision, constraint, and convention in this project. Do not deviate from these instructions unless the user explicitly overrides them.

---

## What This Product Does

DebtFlow Pro helps lenders recover outstanding debt by:
- Managing a portfolio of debtors with their balances, statuses, and contact history
- Running automated outreach campaigns (email/SMS — simulated, no real sends)
- Scoring debtors by risk level using a built-in deterministic algorithm
- Offering debtors a self-service portal to view their balance and make payments (simulated)
- Providing analytics on recovery performance

There are two types of users:
1. **Lender staff** (collectors, admins) — log in to manage debtors and campaigns
2. **Debtors** — access the public portal using their email + reference number (no login required)

---

## Hard Constraints — Never Violate These

- **No paid third-party APIs.** Do not integrate Stripe, Twilio, SendGrid, Resend, Plaid, or any service that requires billing.
- **Payments are simulated.** When a debtor "pays", write a record to the `payments` table. No payment gateway.
- **Communications are simulated.** When a campaign "sends", write records to the `communications` table. No real SMS or email.
- **AI scoring is deterministic.** The risk score is calculated by a local function in `lib/scoring.ts`. Do not call the Anthropic API or any external model.
- **App Router only.** Never use the `pages/` directory, `getServerSideProps`, or `getStaticProps`.
- **TypeScript everywhere.** Every file must be typed. No `any` unless unavoidable and documented.

---

## Tech Stack

| Concern | Tool |
|---------|------|
| Framework | Next.js 14 with App Router |
| Database + Auth | Supabase (Postgres + RLS) |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| Charts | Recharts |
| Icons | lucide-react |
| Deployment | Vercel |

Install shadcn/ui components using: `npx shadcn-ui@latest add <component>`

---

## Project Structure

Maintain this exact structure. Do not invent new top-level directories.

```
debtflow-pro/
├── AGENTS.md                          ← place in repo root
│
├── .codex/
│   └── skills/
│       ├── supabase/
│       │   └── SKILL.md
│       ├── scoring/
│       │   └── SKILL.md
│       ├── seed/
│       │   └── SKILL.md
│       ├── ui/
│       │   └── SKILL.md
│       ├── campaigns/
│       │   └── SKILL.md
│       └── frontend/
│           └── SKILL.md
│
├── app/
│   ├── layout.tsx                     ← root layout, fonts, providers
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                 ← sidebar + navbar shell, auth guard
│   │   ├── dashboard/page.tsx         ← KPI stats, activity feed
│   │   ├── debtors/
│   │   │   ├── page.tsx               ← debtor list with search + filter
│   │   │   └── [id]/page.tsx          ← debtor detail with tabs
│   │   ├── campaigns/
│   │   │   ├── page.tsx               ← campaign list
│   │   │   └── [id]/page.tsx          ← campaign detail + debtor statuses
│   │   ├── payments/page.tsx          ← payment history across all debtors
│   │   └── analytics/page.tsx         ← recovery charts and metrics
│   ├── portal/page.tsx                ← PUBLIC — debtor self-service
│   └── api/
│       ├── seed/route.ts              ← POST — runs seed script
│       ├── score/route.ts             ← POST — scores a debtor
│       └── campaigns/send/route.ts    ← POST — sends a campaign
├── components/
│   ├── ui/                            ← shadcn/ui generated files (do not hand-edit)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Navbar.tsx
│   ├── debtors/
│   │   ├── DebtorTable.tsx
│   │   ├── DebtorFilters.tsx
│   │   ├── DebtorDetail.tsx
│   │   ├── RiskScoreBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   └── PaymentPlanForm.tsx
│   ├── campaigns/
│   │   ├── CampaignCard.tsx
│   │   └── CampaignForm.tsx
│   ├── analytics/
│   │   ├── RecoveryChart.tsx
│   │   └── StatusBreakdown.tsx
│   └── portal/
│       └── DebtorLookup.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  ← browser client (singleton)
│   │   └── server.ts                  ← server client (cookies-based)
│   ├── scoring.ts                     ← deterministic risk scoring
│   ├── seed.ts                        ← seed data generation
│   ├── campaign.ts                    ← campaign send logic
│   ├── types.ts                       ← all shared TypeScript types
│   └── utils.ts                       ← formatCurrency, formatDate, etc.
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql     ← full schema + RLS policies
```

---

## Routing Rules

- `/login` and `/register` — public, redirect to `/dashboard` after auth
- `/dashboard/*` — protected; the `(dashboard)/layout.tsx` checks for a session and redirects to `/login` if none exists
- `/portal` — fully public, no auth check, designed for debtors on mobile
- `/api/*` — server routes; `/api/seed` requires the header `x-seed-secret`

---

## Data Model Summary

See `skills/supabase.md` for the full schema SQL and RLS policies.

Key tables and their purpose:
- `organizations` — multi-tenant root; every record belongs to one org
- `users` — links Supabase auth users to orgs; has a `role` field (admin/collector/viewer)
- `debtors` — core entity; tracks balance, days overdue, status, risk score
- `accounts` — loan details attached to a debtor (loan type, original amount)
- `payments` — payment records (simulated); status is always `completed` for portal payments
- `payment_plans` — installment arrangements; generates child `payment_installments` rows
- `campaigns` — outreach campaigns; tracks sent/response counts
- `campaign_debtors` — join table; tracks per-debtor status within a campaign
- `communications` — one row per outreach attempt; created in bulk when campaign sends
- `audit_logs` — append-only log of user actions

Debtor status values: `current` | `overdue_30` | `overdue_60` | `overdue_90` | `in_payment_plan` | `settled` | `written_off`

Risk label values: `low` | `medium` | `high` | `critical`

---

## Skill Files

Skills are installed at `.codex/skills/<skill-name>/SKILL.md` in the project root. When working on a specific domain, read the relevant skill file before writing code:

| Task | Skill path |
|------|-----------|
| Database schema, migrations, RLS, queries | `.codex/skills/supabase/SKILL.md` |
| Risk score calculation, badge, API route | `.codex/skills/scoring/SKILL.md` |
| Seed script, demo data, `/api/seed` | `.codex/skills/seed/SKILL.md` |
| Any page, component, table, chart, form | `.codex/skills/ui/SKILL.md` |
| Campaign creation, send logic, templates | `.codex/skills/campaigns/SKILL.md` |
| Frontend patterns, React/Next.js, styling, state management | `.codex/skills/frontend/SKILL.md` |


Always read the skill file **before** writing any code for that domain. The skill files contain the authoritative logic and patterns — do not invent alternatives.

---

## Code Conventions

### Naming
- Pages: `page.tsx`, layouts: `layout.tsx`
- Components: `PascalCase.tsx`
- Utilities and lib files: `camelCase.ts`
- Database columns: `snake_case`
- TypeScript types: `PascalCase` (e.g. `Debtor`, `Campaign`, `RiskScore`)

### Component rules
- Functional components only, never class components
- Server components by default; add `'use client'` only when you need `useState`, `useEffect`, or browser APIs
- Never fetch data inside a client component on mount if a server component can do it instead
- Always handle three states: loading (skeleton), empty (empty state with CTA), and data

### Data fetching
- In server components: use `lib/supabase/server.ts` to create a server client and fetch directly
- In client components: use `lib/supabase/client.ts` and local state
- Always destructure `{ data, error }` and handle the error case — never assume success

### Forms
- Use controlled inputs with `useState` — no form libraries
- Validate client-side before submit; show inline error messages below each field
- On success: close the modal/sheet, show a toast, and refresh the data

### Error handling
- Every API route must return `{ error: string }` with an appropriate HTTP status on failure
- Never let errors silently swallow — surface them in the UI with a visible message

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=          # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # from Supabase project settings — safe to expose
SUPABASE_SERVICE_ROLE_KEY=         # server-only — NEVER pass to client components
SEED_SECRET=debtflow-seed-2026     # protects the /api/seed endpoint
```

The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. Only use it in server-side seed/admin routes. If you find yourself importing it in a client component or a `'use client'` file, stop — that is a security bug.

---

## Demo Credentials

After running the seed:
- **Email:** `demo@debtflowpro.com`
- **Password:** `Demo1234!`
- **Org:** Apex Credit Union (80 debtors, 5 campaigns, 10 payment plans pre-loaded)

---

## Build and Dev Commands

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # verify production build before deploying
npm run lint      # ESLint — fix all warnings before submitting
```

---

## Deployment Checklist

Before pushing to Vercel:
1. `npm run build` passes with no errors
2. All four env vars are set in Vercel dashboard
3. Seed has been run: `POST /api/seed` with header `x-seed-secret: debtflow-seed-2026`
4. Demo login works at `/login`
5. `/portal` loads without authentication
6. No `console.error` output on core user flows