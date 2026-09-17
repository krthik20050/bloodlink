create table if not exists public.telegram_conversations (
  chat_id text primary key,
  state text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.telegram_conversations enable row level security;
