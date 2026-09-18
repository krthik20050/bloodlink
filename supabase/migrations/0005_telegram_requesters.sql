create table if not exists public.telegram_requesters (
  requester_id text primary key default gen_random_uuid()::text,
  chat_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.telegram_requesters enable row level security;
