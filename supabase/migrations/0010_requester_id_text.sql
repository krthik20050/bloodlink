-- 0010: live DBs created before 0001 carry blood_requests.requester_id as uuid.
-- Converge it to text (0001's type) so telegram:<id> requester IDs fit.
-- Policies must be dropped first: Postgres forbids altering a column used in one.
-- No-op on DBs that already have text. 0007 recreates the final policies.
drop policy if exists "authenticated users can read own requests" on public.blood_requests;
drop policy if exists "authenticated users can create own requests" on public.blood_requests;
drop policy if exists "requests are readable by requester" on public.blood_requests;
drop policy if exists "requests are writable by requester" on public.blood_requests;
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'blood_requests'
      and column_name = 'requester_id' and data_type = 'uuid'
  ) then
    alter table public.blood_requests alter column requester_id type text;
  end if;
end $$;
