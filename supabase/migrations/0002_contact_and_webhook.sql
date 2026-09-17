alter table donors add column if not exists display_name text;
alter table donors add column if not exists contact text;
alter table notifications add column if not exists action_token_hash text;
create index if not exists donors_matching_index on donors (blood_group, availability_status) where notification_consent = true;
create index if not exists notifications_request_donor_index on notifications (request_id, donor_id);
