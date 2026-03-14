---
name: supabase
description: Supabase schema, migrations, RLS policies, and query patterns for DebtFlow Pro. Read this skill before touching anything database-related: creating tables, writing migrations, setting up RLS, querying debtors or campaigns, or debugging Supabase errors. Also read this when implementing multi-tenant data isolation or the Supabase client setup.
---

# Supabase — DebtFlow Pro

This skill covers everything database-related. Read the relevant section for your current task, then implement accordingly.

---

## Client Setup

Create two Supabase client factories — one for server components (reads cookies), one for the browser.

**`lib/supabase/server.ts`** — use this in Server Components, Route Handlers, and Middleware:
```ts
import { createServerClient as _create, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'

export function createServerClient() {
  const cookieStore = cookies()
  return _create<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}
```

**`lib/supabase/client.ts`** — use this in Client Components (`'use client'` files only):
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Prefer the server client whenever possible. Only use the browser client when you genuinely need reactivity or are inside a `'use client'` component.

---

## Full Schema Migration

Save this as `supabase/migrations/001_initial_schema.sql` and run it in the Supabase SQL editor.

```sql
create extension if not exists "uuid-ossp";

-- Organizations (multi-tenant root)
create table organizations (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz default now()
);

-- Users (links Supabase auth to orgs)
create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'collector'
             check (role in ('admin','collector','viewer')),
  created_at timestamptz default now()
);

-- Debtors (core entity)
create table debtors (
  id                   uuid primary key default uuid_generate_v4(),
  org_id               uuid not null references organizations(id) on delete cascade,
  full_name            text not null,
  email                text,
  phone                text,
  reference_number     text not null,
  total_owed           numeric(12,2) not null default 0,
  outstanding_amount   numeric(12,2) not null default 0,
  days_overdue         integer not null default 0,
  status               text not null default 'current'
                       check (status in (
                         'current','overdue_30','overdue_60','overdue_90',
                         'in_payment_plan','settled','written_off'
                       )),
  risk_score           integer check (risk_score between 0 and 100),
  risk_label           text check (risk_label in ('low','medium','high','critical')),
  recommended_action   text,
  best_contact_channel text check (best_contact_channel in ('sms','email','call')),
  contact_attempts     integer not null default 0,
  failed_payments      integer not null default 0,
  ai_analyzed_at       timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Accounts (loan details per debtor)
create table accounts (
  id                 uuid primary key default uuid_generate_v4(),
  debtor_id          uuid not null references debtors(id) on delete cascade,
  org_id             uuid not null references organizations(id) on delete cascade,
  loan_type          text not null,
  original_amount    numeric(12,2) not null,
  outstanding_amount numeric(12,2) not null,
  opened_at          date,
  default_date       date,
  created_at         timestamptz default now()
);

-- Payments (simulated — no real gateway)
create table payments (
  id           uuid primary key default uuid_generate_v4(),
  debtor_id    uuid not null references debtors(id) on delete cascade,
  org_id       uuid not null references organizations(id) on delete cascade,
  amount       numeric(12,2) not null,
  payment_date date not null default current_date,
  method       text not null default 'portal'
               check (method in ('bank_transfer','card','cash','cheque','portal')),
  status       text not null default 'completed'
               check (status in ('pending','completed','failed')),
  notes        text,
  created_at   timestamptz default now()
);

-- Payment plans
create table payment_plans (
  id                 uuid primary key default uuid_generate_v4(),
  debtor_id          uuid not null references debtors(id) on delete cascade,
  org_id             uuid not null references organizations(id) on delete cascade,
  total_amount       numeric(12,2) not null,
  installment_amount numeric(12,2) not null,
  frequency          text not null check (frequency in ('weekly','monthly')),
  start_date         date not null,
  installments_total integer not null,
  installments_paid  integer not null default 0,
  status             text not null default 'active'
                     check (status in ('active','completed','defaulted','cancelled')),
  created_at         timestamptz default now()
);

-- Individual installments within a plan
create table payment_installments (
  id         uuid primary key default uuid_generate_v4(),
  plan_id    uuid not null references payment_plans(id) on delete cascade,
  due_date   date not null,
  amount     numeric(12,2) not null,
  status     text not null default 'upcoming'
             check (status in ('upcoming','paid','overdue','skipped')),
  paid_at    timestamptz,
  created_at timestamptz default now()
);

-- Campaigns (outreach batches)
create table campaigns (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references organizations(id) on delete cascade,
  name             text not null,
  status           text not null default 'draft'
                   check (status in ('draft','active','completed','paused')),
  target_segment   text not null
                   check (target_segment in (
                     'all','overdue_30','overdue_60','overdue_90','in_payment_plan'
                   )),
  channel          text not null check (channel in ('sms','email','call')),
  message_template text not null,
  scheduled_at     timestamptz,
  sent_count       integer not null default 0,
  response_count   integer not null default 0,
  created_at       timestamptz default now()
);

-- Per-debtor campaign tracking
create table campaign_debtors (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  debtor_id    uuid not null references debtors(id) on delete cascade,
  status       text not null default 'sent'
               check (status in ('sent','delivered','responded','failed')),
  sent_at      timestamptz default now(),
  responded_at timestamptz
);

-- Communications log (one row per outreach attempt)
create table communications (
  id          uuid primary key default uuid_generate_v4(),
  debtor_id   uuid not null references debtors(id) on delete cascade,
  org_id      uuid not null references organizations(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  channel     text not null check (channel in ('sms','email','call','portal')),
  direction   text not null default 'outbound'
              check (direction in ('outbound','inbound')),
  status      text not null default 'sent'
              check (status in ('sent','delivered','failed','responded')),
  message     text,
  sent_at     timestamptz default now()
);

-- Append-only audit log
create table audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz default now()
);

-- Indexes for common query patterns
create index on debtors(org_id, status);
create index on debtors(org_id, days_overdue);
create index on payments(debtor_id);
create index on communications(debtor_id);
create index on campaigns(org_id, status);
create index on campaign_debtors(campaign_id);
create index on payment_installments(plan_id);
```

---

## Row Level Security (RLS)

Enable RLS on every table, then create an `org_isolation` policy that gates all access to the current user's org. Use a helper function so the policy logic stays clean and consistent.

```sql
-- Helper: returns the org_id of the currently authenticated user
create or replace function get_org_id()
returns uuid language sql security definer stable as $$
  select org_id from users where id = auth.uid()
$$;

-- Enable RLS
alter table organizations        enable row level security;
alter table users                enable row level security;
alter table debtors              enable row level security;
alter table accounts             enable row level security;
alter table payments             enable row level security;
alter table payment_plans        enable row level security;
alter table payment_installments enable row level security;
alter table campaigns            enable row level security;
alter table campaign_debtors     enable row level security;
alter table communications       enable row level security;
alter table audit_logs           enable row level security;

-- Org-scoped policies
create policy "org_isolation" on organizations        for all using (id = get_org_id());
create policy "org_isolation" on users                for all using (org_id = get_org_id());
create policy "org_isolation" on debtors              for all using (org_id = get_org_id());
create policy "org_isolation" on accounts             for all using (org_id = get_org_id());
create policy "org_isolation" on payments             for all using (org_id = get_org_id());
create policy "org_isolation" on payment_plans        for all using (org_id = get_org_id());
create policy "org_isolation" on campaigns            for all using (org_id = get_org_id());
create policy "org_isolation" on communications       for all using (org_id = get_org_id());
create policy "org_isolation" on audit_logs           for all using (org_id = get_org_id());

-- Installments and campaign_debtors join through parent tables
create policy "org_isolation" on payment_installments for all using (
  plan_id in (select id from payment_plans where org_id = get_org_id())
);
create policy "org_isolation" on campaign_debtors for all using (
  campaign_id in (select id from campaigns where org_id = get_org_id())
);

-- Portal: allow unauthenticated lookup by reference_number
-- This must come AFTER the org_isolation policy
create policy "portal_public_lookup" on debtors
  for select using (true);
```

The `portal_public_lookup` policy allows the public portal to find a debtor by reference number without auth. This is intentional — reference numbers are the "password" for portal access.

---

## Common Query Patterns

### Get the current user's org and role (server component)
```ts
const supabase = createServerClient()
const { data: { user } } = await supabase.auth.getUser()
const { data: me } = await supabase
  .from('users')
  .select('org_id, role, full_name')
  .eq('id', user!.id)
  .single()
```

### Debtor list with filters
Always filter server-side — never fetch all debtors and filter in JS.
```ts
let query = supabase
  .from('debtors')
  .select('id, full_name, reference_number, outstanding_amount, days_overdue, status, risk_score, risk_label')
  .order('days_overdue', { ascending: false })

if (status && status !== 'all') query = query.eq('status', status)
if (search) query = query.ilike('full_name', `%${search}%`)

const { data: debtors, error } = await query
```

### Debtor detail with all relations
```ts
const { data: debtor } = await supabase
  .from('debtors')
  .select(`
    *,
    accounts(*),
    payments(* order by payment_date desc),
    payment_plans(*, payment_installments(* order by due_date asc)),
    communications(* order by sent_at desc)
  `)
  .eq('id', debtorId)
  .single()
```

### Creating a payment plan (always do this atomically)
```ts
// Step 1: insert the plan
const { data: plan } = await supabase
  .from('payment_plans')
  .insert({ debtor_id, org_id, total_amount, installment_amount, frequency, start_date, installments_total })
  .select()
  .single()

// Step 2: generate all installment rows at once
const installments = Array.from({ length: installments_total }, (_, i) => {
  const due = frequency === 'monthly'
    ? addMonths(new Date(start_date), i)
    : addWeeks(new Date(start_date), i)
  return { plan_id: plan!.id, due_date: due.toISOString().split('T')[0], amount: installment_amount, status: 'upcoming' }
})
await supabase.from('payment_installments').insert(installments)

// Step 3: update the debtor's status
await supabase.from('debtors').update({ status: 'in_payment_plan', updated_at: new Date().toISOString() }).eq('id', debtor_id)
```

### Portal debtor lookup (unauthenticated)
Use the browser client here — no session exists.
```ts
const { data: debtor } = await supabase
  .from('debtors')
  .select('id, full_name, reference_number, outstanding_amount, status, payment_plans(*)')
  .eq('email', email)
  .eq('reference_number', reference)
  .single()
```

---

## Auth Flow

- After login, Supabase sets a session cookie automatically via `@supabase/ssr`
- In `(dashboard)/layout.tsx`, call `supabase.auth.getUser()` and redirect to `/login` if no user
- After logout, call `supabase.auth.signOut()` — this clears the cookie
- Never trust `getSession()` for server-side auth checks — use `getUser()` which verifies the JWT with the Supabase server

---

## Common Mistakes to Avoid

- **Do not use `supabase.auth.getSession()` for security checks.** It reads from the cookie without server verification. Use `getUser()`.
- **Do not call `createServerClient()` in a Client Component.** It imports `cookies()` from `next/headers` which only works server-side.
- **Do not forget `updated_at` when updating debtors.** Always set it to `new Date().toISOString()`.
- **Do not `.select('*')` in list views.** Select only the columns you need — debtor records are large.