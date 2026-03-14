alter table debtors
  add column if not exists ai_summary text,
  add column if not exists ai_source text not null default 'deterministic'
    check (ai_source in ('openai','deterministic')),
  add column if not exists ai_model text;
