create extension if not exists "uuid-ossp";

create table organizations (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz default now()
);

create table users (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references organizations(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'collector'
             check (role in ('admin','collector','viewer')),
  created_at timestamptz default now()
);

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
  ai_summary           text,
  ai_source            text not null default 'deterministic'
                       check (ai_source in ('openai','deterministic')),
  ai_model             text,
  contact_attempts     integer not null default 0,
  failed_payments      integer not null default 0,
  ai_analyzed_at       timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

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

create table campaign_debtors (
  id           uuid primary key default uuid_generate_v4(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  debtor_id    uuid not null references debtors(id) on delete cascade,
  status       text not null default 'sent'
               check (status in ('sent','delivered','responded','failed')),
  sent_at      timestamptz default now(),
  responded_at timestamptz
);

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

create index on debtors(org_id, status);
create index on debtors(org_id, days_overdue);
create index on payments(debtor_id);
create index on communications(debtor_id);
create index on campaigns(org_id, status);
create index on campaign_debtors(campaign_id);
create index on payment_installments(plan_id);

create or replace function get_org_id()
returns uuid language sql security definer stable as $$
  select org_id from users where id = auth.uid()
$$;

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

create policy "org_isolation" on organizations        for all using (id = get_org_id());
create policy "org_isolation" on users                for all using (org_id = get_org_id());
create policy "org_isolation" on debtors              for all using (org_id = get_org_id());
create policy "org_isolation" on accounts             for all using (org_id = get_org_id());
create policy "org_isolation" on payments             for all using (org_id = get_org_id());
create policy "org_isolation" on payment_plans        for all using (org_id = get_org_id());
create policy "org_isolation" on campaigns            for all using (org_id = get_org_id());
create policy "org_isolation" on communications       for all using (org_id = get_org_id());
create policy "org_isolation" on audit_logs           for all using (org_id = get_org_id());

create policy "org_isolation" on payment_installments for all using (
  plan_id in (select id from payment_plans where org_id = get_org_id())
);
create policy "org_isolation" on campaign_debtors for all using (
  campaign_id in (select id from campaigns where org_id = get_org_id())
);

create policy "portal_public_lookup" on debtors
  for select to anon using (true);
