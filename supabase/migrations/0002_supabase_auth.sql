do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.donors'::regclass
      and conname = 'donors_user_id_fkey'
  ) then
    alter table public.donors add constraint donors_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create index if not exists donors_user_id_idx on public.donors(user_id);
create index if not exists blood_requests_requester_id_idx on public.blood_requests(requester_id);

drop policy if exists "authenticated users can read own donor profile" on public.donors;
create policy "authenticated users can read own donor profile"
  on public.donors for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "authenticated users can create own donor profile" on public.donors;
create policy "authenticated users can create own donor profile"
  on public.donors for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "authenticated users can update own donor profile" on public.donors;
create policy "authenticated users can update own donor profile"
  on public.donors for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "authenticated users can read own requests" on public.blood_requests;
create policy "authenticated users can read own requests"
  on public.blood_requests for select to authenticated
  using (requester_id::text = auth.uid()::text);

drop policy if exists "authenticated users can create own requests" on public.blood_requests;
create policy "authenticated users can create own requests"
  on public.blood_requests for insert to authenticated
  with check (requester_id::text = auth.uid()::text);
