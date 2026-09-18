# BloodLink handoff runbook

This is the operational handoff for the BloodLink repository as of 2026-09-18. BloodLink is a Telegram-first coordination system: the Next.js application collects authenticated, structured donor/requester data; Supabase stores state; Telegram delivers registration prompts and time-sensitive notifications. It is not a blood bank, medical screening service, emergency dispatch service, or public donor directory.

## Current architecture and completed features

- **Web:** Next.js 16 App Router, React 19, mobile-first donor and requester pages, Supabase email/password, magic-link, and Google sign-in.
- **Server:** route handlers authenticate with Supabase, validate request bodies with Zod, and use server-only Supabase adapters.
- **Persistence:** donors, blood requests, notifications, matches, Telegram links, and Telegram conversations are represented in Supabase migrations and `lib/supabase/repository.ts`.
- **Matching:** red-cell compatibility, 90-day donation interval, consent/availability/paused-status filters, active-match and duplicate-contact protection, Haversine distance, and configured notification waves (5 within 3 km, 10 within 5 km, 20 within 10 km).
- **Telegram:** `/start`, `/donate`, `/help`, `/status`, `/cancel`, and `/disconnect`; inline accept/decline actions; location sharing; deep-link donor registration; persisted conversation state; webhook-secret validation outside mock mode.
- **Providers:** guarded e-RaktKosh availability lookup and OpenStreetMap Overpass nearby-hospital lookup. Both fail closed and return narrow domain shapes.
- **Admin work in the feature branch:** an explicit Supabase-backed `admin_users` authorization table and operational admin APIs/UI exist in commit `7a91d90`/`4114103`, but are not present on this handoff branch until that branch is merged.

The important remaining durability boundary is the matching/notification path. `lib/store.ts` is still used by parts of the legacy/demo lifecycle on the current baseline. Do not call a local success proof of production durability until all matching and notification reads/writes use the repository and have an integration test against Supabase.

## Branch and commit assumptions

This branch was created from `main` and is documentation-only. The following commits are useful integration landmarks:

| Commit | Meaning |
| --- | --- |
| `a0a3f67` | Initial BloodLink MVP foundation |
| `66a04e2` | Supabase authentication |
| `59c0dc7` | Direct Telegram donor registration |
| `2deafa2` | Telegram and e-RaktKosh flows |
| `43fe505` | Nearby hospital selection |
| `a8cfa5c` | Durable matching persistence and request-origin protection |
| `13db1fd` | Telegram requester workflow; adds migration 0005 |
| `7a91d90` | Secure admin operations surface; initially adds admin migration |
| `4114103` | Renames the admin migration to 0006 to resolve the numbering collision |

Do not assume every listed feature is in the current checkout. Before merging feature branches, inspect their ancestry and migrations, resolve the two historical `0002` filenames deliberately, then run the full verification commands below. Never edit an already-applied migration to repair numbering; add a new migration or apply the agreed branch order before production.

## Supabase migration order: 0001-0006

Apply migrations once, in this order, using the exact files that exist after the feature branches are integrated:

1. `0001_bloodlink.sql` — core enums and tables (`donors`, `blood_requests`, `notifications`, `matches`) plus initial RLS enablement.
2. `0002_supabase_auth.sql` — Auth ownership columns, indexes, and authenticated owner policies.
3. `0003_rls_policies.sql` — involved-user read policies for notifications/matches and owner write/read policies.
4. `0004_telegram_conversations.sql` — persisted Telegram conversation state.
5. `0005_telegram_requesters.sql` — Telegram requester identity mapping used by the requester workflow.
6. `0006_admin_authorization.sql` — active `ADMIN`/`OPS` authorization records in `public.admin_users`.

The baseline currently contains two files prefixed `0002` (`0002_contact_and_webhook.sql` and `0002_supabase_auth.sql`) and only migrations through `0004`. This is a migration-history issue, not permission to guess. Confirm which SQL has already been applied in the target Supabase project and use the feature-branch resolution before deploying `0005` or `0006`.

After each deployment, verify the expected tables, indexes, RLS enabled flags, and policies in the Supabase SQL editor. Keep a record of the applied migration filenames/versions in the deployment ticket.

## Creating the first admin safely

Admin access is an authorization row, not a shared password and not a frontend flag.

1. Create or invite the operator in **Supabase Auth** using the normal email/password or invitation flow. Require a verified email and use a named individual account.
2. Copy that user's UUID from Auth; do not use an email address as the authorization key.
3. Apply migrations through `0006_admin_authorization.sql`.
4. In the Supabase SQL editor, insert only the UUID and least-privilege role:

   ```sql
   insert into public.admin_users (user_id, role, is_active)
   values ('AUTH_USER_UUID', 'OPS', true);
   ```

   Use `ADMIN` only for an operator who genuinely needs administrative authority.
5. Sign in as that user and verify `/admin` plus each admin API returns data. Verify an ordinary authenticated user receives `401`/`403` and that admin responses contain no donor contact details, coordinates, Telegram IDs, or token hashes.
6. Keep the SQL editor audit trail and remove/deactivate the row immediately when access is no longer needed:

   ```sql
   update public.admin_users
   set is_active = false
   where user_id = 'AUTH_USER_UUID';
   ```

Never put the service-role key in browser code, never create a shared admin account, and never grant access by editing client-side state.

## Required environment variables

Copy `.env.example` to `.env.local` for local work. Configure the same values in the appropriate Vercel environments:

| Variable | Required use |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Browser origin and Telegram deep links |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/SSR public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only repository/admin operations |
| `TELEGRAM_BOT_TOKEN` | Server-only Telegram Bot API calls |
| `TELEGRAM_WEBHOOK_SECRET` | Secret webhook request verification |
| `TELEGRAM_BOT_USERNAME` | Server-generated Telegram deep links |
| `MOCK_TELEGRAM` | `true` for local non-delivery; `false` for real Telegram |
| `RAKTKOSH_ENDPOINT` | Official availability endpoint |
| `RAKTKOSH_STATE_CODE` | e-RaktKosh state query value |
| `RAKTKOSH_DISTRICT_CODE` | e-RaktKosh district query value |

The browser pages also read `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` for their Telegram CTA. Set it to the same username when deploying, or normalize that client-side configuration before calling the setup complete. Google OAuth client secrets belong in Supabase Auth provider configuration, not in this repository's environment file.

## Telegram webhook setup

1. Create the bot with BotFather and keep the bot token private. Set `TELEGRAM_BOT_USERNAME` to the username without `@`.
2. Deploy the app and confirm `https://<production-host>/api/telegram/webhook` responds through the deployed route.
3. Apply migrations through `0004` before donor registration and through `0005` before Telegram requester registration.
4. Set the webhook with a secret path header value known only to Telegram and the deployment:

   ```bash
   curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\":\"https://<production-host>/api/telegram/webhook\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\",\"allowed_updates\":[\"message\",\"callback_query\"]}"
   ```

5. Confirm `getWebhookInfo` reports the expected URL and no persistent delivery error. Send `/start` and `/donate` from a test account, exercise location sharing, and verify conversation rows change in Supabase.
6. Set `MOCK_TELEGRAM=false` only after the secret, token, migrations, and production URL are verified. Rotate the token and webhook secret if either is exposed.

## Supabase and Vercel deployment checklist

- [ ] Create/select the intended Supabase project and record its project ref.
- [ ] Apply and verify migrations `0001` through `0006` in order; resolve the baseline `0002` filename collision before applying anything new.
- [ ] Confirm Auth providers, email settings, and Google callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).
- [ ] Add production callback allow-list entries such as `https://<production-host>/auth/callback`.
- [ ] Set all required Vercel environment variables for Preview and Production; keep service-role and Telegram values server-only.
- [ ] Deploy with `pnpm build`/Vercel and verify `/`, `/auth`, `/donor`, `/request`, `/admin` (authorized user only), and `/api/integrations/status`.
- [ ] Verify RLS with both an ordinary user and the first admin; do not treat service-role queries as an RLS test.
- [ ] Configure and verify Telegram webhook delivery.
- [ ] Test one donor registration, one requester flow, one notification action, and one denied admin request with synthetic/test data.
- [ ] Check logs for provider timeouts, failed Telegram sends, webhook retries, and unexpected PII before enabling real use.

## Known remaining gaps

1. Finish and integration-test the fully persisted matching and notification lifecycle; remove the serverless-unsafe legacy store path.
2. Add Telegram update-id idempotency so webhook retries cannot repeat registration or actions.
3. Add rate limiting for authentication, donor/request creation, admin reads, and Telegram actions.
4. Add audit logging and operational monitoring for admin access, notification delivery, provider timeouts, and abandoned conversations.
5. Verify e-RaktKosh endpoint behavior and state/district codes with real deployment data.
6. Add Supabase integration coverage for Auth, RLS, persisted matching, migration order, and webhook retries.
7. Reconcile the public Telegram username variable (`TELEGRAM_BOT_USERNAME` versus `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`) before relying on client CTAs.
8. Define the contact-exchange policy and account/settings lifecycle without exposing donor details.

## Test and build commands

```bash
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Run `pnpm dev` for local UI checks. Local tests cover deterministic matching, eligibility, Telegram date parsing, Telegram helpers, origin protection, and (on the admin feature branch) admin policy/metrics. A passing local suite does not validate Supabase RLS or cross-instance durability.

## Secrets and PII cautions

- Never commit `.env.local`, Supabase service-role keys, Telegram bot tokens, webhook secrets, OAuth secrets, Vercel tokens, database exports, or deployment logs containing them.
- Public Supabase URLs and publishable/anon keys are not secrets, but still configure them through environment management rather than hardcoding them.
- Treat names, email/contact fields, coordinates, Telegram chat IDs, blood groups, and request details as personal or sensitive data. Use synthetic data in development and avoid copying production rows into issues, logs, screenshots, or test fixtures.
- Do not log raw action tokens, authorization credentials, full Telegram updates, or precise location data. Store action-token hashes only.
- Telegram updates, browser input, e-RaktKosh responses, and Overpass responses are untrusted. Validate them server-side, enforce ownership, use timeouts, and fail closed.
- RLS is defense in depth; service-role clients bypass it. Every route and admin operation must still authenticate and authorize the caller.
- BloodLink does not establish medical eligibility or guarantee blood availability. Keep clinical decisions with the donor, requester, hospital, and authorized healthcare professionals.
