-- 0008: notification tokens expire after 72h (fail-closed).
-- ponytail: default for new rows + backfill for pre-migration NULLs.
alter table public.notifications add column if not exists expires_at timestamptz default now() + interval '72 hours';
update public.notifications set expires_at = now() + interval '72 hours' where expires_at is null;
