# DebtFlow Pro

**AI-powered debt recovery for mid-market lenders and credit unions.**

DebtFlow Pro gives collector teams a single place to prioritize debtors, run outreach campaigns, and track payments—and gives borrowers a simple, mobile-friendly portal to view their balance and pay online. No paid third-party APIs; built to deploy and demo quickly.

---

## Features

| For collectors | For borrowers |
|----------------|---------------|
| **Portfolio view** — Debtors with balances, statuses, risk scores, contact history | **Self-service portal** — Look up account with email + reference number (no login) |
| **Risk scoring** — Built-in deterministic scoring (low → critical) | **Balance & plan** — See outstanding amount, payment plan, installments |
| **Campaigns** — Create and “send” outreach; track who was contacted | **Pay online** — Card checkout with real validation; balance updates in real time |
| **Payment plans** — Create plans with installments; track paid/overdue | **Payment history** — Recent payments and receipts |
| **Analytics** — Recovery trends, status breakdown, campaign performance | **Mobile-friendly** — Usable on any device |

Payments and communications are **simulated** (records in your database only)—no payment gateway or SMS/email providers. Ideal for demos, hackathons, and controlled rollouts.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database & auth | Supabase (PostgreSQL + RLS) |
| Styling | Tailwind CSS 4 |
| UI | shadcn/ui, Recharts, lucide-react |
| Deployment | Vercel |

---

## Prerequisites

- **Node.js** 
- **npm** (or yarn/pnpm)
- **Supabase** project ([supabase.com](https://supabase.com))

---

## Quick start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd debtflow-pro
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# From Supabase: Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only (e.g. seed). Never expose to the client.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Protects the /api/seed endpoint — set your own secret; do not commit or share
SEED_SECRET=your-seed-secret
```

### 3. Database

Apply the schema and (if needed) run migrations from `supabase/migrations/` in your Supabase project (SQL Editor or CLI).

### 4. Seed demo data

Start the app, then run the seed once:

```bash
npm run dev
```

In another terminal (use the same value you set for `SEED_SECRET`):

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "x-seed-secret: your-seed-secret"
```

### 5. Run the app

- **App:** [http://localhost:3000](http://localhost:3000)
- **Collector login:** [http://localhost:3000/login](http://localhost:3000/login)
- **Borrower portal:** [http://localhost:3000/portal](http://localhost:3000/portal)

---

## Demo credentials

After seeding:

| Role | Email | Password |
|------|--------|----------|
| Collector (Apex Credit Union) | `demo@debtflowpro.com` | `Demo1234!` |

Use this account to explore the dashboard, debtors, campaigns, payment plans, and analytics. For the **borrower portal**, use the same seeded debtor email and reference number (e.g. from the debtors list) to look up an account and make a payment.

---

## Scripts

| Command | Description |
|---------|--------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Project structure

```
debtflow-pro/
├── app/
│   ├── (auth)/          # Login, register
│   ├── (dashboard)/     # Dashboard, debtors, campaigns, payments, analytics
│   ├── portal/          # Public borrower portal
│   └── api/              # Seed, score, campaign send, portal lookup/pay
├── components/           # UI, layout, debtors, campaigns, analytics, portal
├── lib/                  # Supabase clients, scoring, seed, types, utils
└── supabase/
    └── migrations/       # Schema and RLS
```

---

## Deployment (Vercel)

1. Push the repo and import the project in Vercel.
2. Add the same environment variables in the Vercel dashboard.
3. Deploy. After the first deploy, run the seed once (use the same value as `SEED_SECRET` in Vercel):
   ```bash
   curl -X POST https://your-app.vercel.app/api/seed \
     -H "x-seed-secret: YOUR_SEED_SECRET"
   ```
4. Confirm:
   - Login at `/login` with the demo credentials
   - Portal at `/portal` loads without auth
   - Debtors and campaigns show seeded data

---
