-- 0007: redeployable RLS cast fix. 0003 was edited in place so it never
-- redeploys on existing DBs; this migration re-applies the policies idempotently.
-- ponytail: drop-if-exists + recreate, no other change.
drop policy if exists "requests are readable by requester" on public.blood_requests;
drop policy if exists "requests are writable by requester" on public.blood_requests;
drop policy if exists "notifications are visible to involved users" on public.notifications;
drop policy if exists "matches are visible to involved users" on public.matches;

create policy "requests are readable by requester"
  on public.blood_requests for select using (auth.uid()::text = requester_id);
create policy "requests are writable by requester"
  on public.blood_requests for all using (auth.uid()::text = requester_id) with check (auth.uid()::text = requester_id);

create policy "notifications are visible to involved users"
  on public.notifications for select using (
    exists (select 1 from public.donors d where d.id = donor_id and d.user_id = auth.uid())
    or exists (select 1 from public.blood_requests r where r.id = request_id and auth.uid()::text = r.requester_id)
  );

create policy "matches are visible to involved users"
  on public.matches for select using (
    exists (select 1 from public.donors d where d.id = donor_id and d.user_id = auth.uid())
    or exists (select 1 from public.blood_requests r where r.id = request_id and auth.uid()::text = r.requester_id)
  );
