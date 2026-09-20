create policy "donors are readable by owner"
  on donors for select using (auth.uid() = user_id);
create policy "donors are writable by owner"
  on donors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "requests are readable by requester"
  on blood_requests for select using (auth.uid()::text = requester_id);
create policy "requests are writable by requester"
  on blood_requests for all using (auth.uid()::text = requester_id) with check (auth.uid()::text = requester_id);

create policy "notifications are visible to involved users"
  on notifications for select using (
    exists (select 1 from donors d where d.id = donor_id and d.user_id = auth.uid())
    or exists (select 1 from blood_requests r where r.id = request_id and r.requester_id = auth.uid()::text)
  );

create policy "matches are visible to involved users"
  on matches for select using (
    exists (select 1 from donors d where d.id = donor_id and d.user_id = auth.uid())
    or exists (select 1 from blood_requests r where r.id = request_id and r.requester_id = auth.uid()::text)
  );
