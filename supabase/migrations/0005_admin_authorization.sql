create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'OPS' check (role in ('ADMIN', 'OPS')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "admins can read their own authorization"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

create index if not exists admin_users_active_idx on public.admin_users(is_active) where is_active;
