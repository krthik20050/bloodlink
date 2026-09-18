# Production deployment and verification

This checklist is intentionally safe to run against a production candidate. It
does not print secret values, alter data, or make destructive database changes.

## 1. Preflight

Before deploying, confirm:

- The release contains `supabase/migrations/0001` through `0006`.
- The two legacy `0002` files are applied explicitly, not through an
  alphabetical glob. The required schema order is:
  1. `0001_bloodlink.sql`
  2. `0002_contact_and_webhook.sql`
  3. `0002_supabase_auth.sql`
  4. `0003_rls_policies.sql`
  5. `0004_telegram_conversations.sql`
  6. `0005_telegram_requesters.sql`
  7. `0006_admin_authorization.sql`
- `NEXT_PUBLIC_APP_URL` is the HTTPS production URL with no trailing slash.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and
  `SUPABASE_SERVICE_ROLE_KEY` are configured in the deployment provider.
- `MOCK_TELEGRAM=false`, `TELEGRAM_BOT_TOKEN`, and
  `TELEGRAM_WEBHOOK_SECRET` are configured only in server-side deployment
  secrets. The webhook secret must be a new, high-entropy value; never reuse
  the bot token.
- The Supabase Auth redirect allowlist contains
  `https://<production-host>/auth/callback`.
- OAuth provider settings and the e-RaktKosh endpoint/state/district values
  have been checked for the production environment.

Do not copy `.env.local`, a database dump, or a service-role key into source
control, a ticket, or a chat transcript.

## 2. Apply migrations

Use the Supabase SQL editor or a reviewed migration workflow and apply the
files above one at a time in the listed order. The duplicate `0002` prefix is
historical, so do not use a wildcard such as `*.sql` and do not assume the
dashboard will infer the intended order. Stop if any statement fails; record
the failed filename and error before retrying.

The migrations are idempotent only where their SQL says `if not exists`.
Re-running a partially applied migration is not a rollback. Take the normal
Supabase backup/snapshot required by your deployment policy before applying
schema changes.

## 3. Create the first admin safely

Create and verify the operator account in Supabase Auth first. Then run this
statement in the Supabase SQL editor, replacing the placeholder with that
user's UUID from `auth.users`:

```sql
insert into public.admin_users (user_id, role, is_active)
select '<AUTH_USER_UUID>'::uuid, 'ADMIN', true
where exists (
  select 1 from auth.users where id = '<AUTH_USER_UUID>'::uuid
)
on conflict (user_id) do update
set role = excluded.role,
    is_active = excluded.is_active;
```

The placeholder is deliberately not a real credential or user identifier.
Verify the row with a separate, read-only query and remove or deactivate the
account through a reviewed change if the operator leaves the project:

```sql
select user_id, role, is_active, created_at
from public.admin_users
where user_id = '<AUTH_USER_UUID>'::uuid;
```

## 4. Configure and verify Telegram

Set the webhook to the exact deployed route and send the same secret value in
the Telegram API request:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
  ?url=https://<production-host>/api/telegram/webhook
  &secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

Use an API client that URL-encodes query values. Do not paste the expanded URL
into logs or commit it. Confirm the response reports `ok: true`, then inspect
`getWebhookInfo` and verify the URL, certificate/error state, and pending
update count.

The route rejects requests without the
`x-telegram-bot-api-secret-token` header when mock mode is disabled. A safe
smoke test uses a harmless empty update and the configured secret:

```bash
curl -i -X POST "https://<production-host>/api/telegram/webhook" \
  -H "content-type: application/json" \
  -H "x-telegram-bot-api-secret-token: <TELEGRAM_WEBHOOK_SECRET>" \
  --data '{"update_id":0}'
```

Do not send a real donor, requester, location, or callback update during a
smoke test.

## 5. Verify health and integrations

Authenticate as the first admin, then call:

```text
GET https://<production-host>/api/integrations/status
```

Expected results:

- `telegram.configured` is `true` and `botUsername` is present.
- `supabase.configured` and `supabase.reachable` are `true`.
- A failed provider check is investigated from server logs; it is not treated
  as a successful deployment.

Also verify a sign-in callback, an authenticated read of the admin surface,
and one non-destructive read of the production request/donor flows. Do not
create test donor or blood-request records unless the deployment runbook
explicitly provides a cleanup-safe test tenant.

## 6. Rollback and incident checks

If the new application fails health checks, first restore the previous
application deployment while keeping the database unchanged. Do not roll back
schema by dropping tables or columns. Capture the migration filename and
error, pause new writes if required by the incident procedure, and use a
forward corrective migration reviewed by the team.

After rollback, verify:

1. The previous deployment serves the integration status endpoint and sign-in callback.
2. Telegram `getWebhookInfo` still points to the intended live route.
3. No webhook secret or service-role key was exposed in build logs.
4. Supabase logs show no unexpected permission or migration errors.
