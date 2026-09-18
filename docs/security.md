# Security model

## Trust boundaries

- Browser code is untrusted. It receives only public Supabase client configuration.
- Next.js route handlers are the application trust boundary. They validate JSON with Zod and derive ownership from the verified Supabase session.
- The Supabase service-role key is server-only and bypasses RLS. Route ownership checks remain mandatory.
- Telegram updates are untrusted external input. Real webhook requests require `TELEGRAM_WEBHOOK_SECRET`.
- e-RaktKosh and OpenStreetMap/Overpass responses are untrusted provider data. Adapters validate shape, host, protocol, and timeouts.

## Controls in place

- Donor and requester reads are scoped to the authenticated user.
- Donor contact fields are omitted from list responses.
- Notification action tokens are sent only through Telegram and stored as SHA-256 hashes.
- Matching responses do not return raw action tokens.
- Acceptance rechecks request status, donor consent, donor availability, donation interval, and blood compatibility.
- Raktkosh integration is server-only, allowlisted, timeout-protected, cached briefly, and returns only explicit availability.
- `.env.local`, Vercel metadata, build output, package stores, and TypeScript build artifacts are ignored by Git.

## Database setup

Apply migrations `0001` through `0005` in order. Migrations `0002` and `0003` establish Auth ownership and RLS policies; migration `0004` stores Telegram conversation state; migration `0005` establishes explicit admin authorization. RLS does not replace route checks because service-role operations bypass RLS.

## Secrets

Never commit:

- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- Google OAuth client secrets
- Vercel tokens
- `.env.local` or deployment exports

Public Supabase URL and publishable/anon keys are not authentication secrets, but they must still be configured through the documented environment flow rather than hardcoded in source.

## Known gaps

- The matching route and part of notification delivery still use the legacy in-memory store. This is a durability and isolation risk across serverless instances and must be migrated to the repository.
- Telegram webhook update idempotency is not complete; retries can repeat work.
- Rate limiting and audit logging are not yet implemented.
- External provider availability and operational limits must be verified before relying on them for emergency decisions.
- A production deployment should have monitoring for failed callbacks, notification delivery, and provider timeouts.
## Admin operations

Administrative access is an explicit Supabase-backed authorization record, not a shared frontend password. Deploy migration `0005_admin_authorization.sql`, then insert an authenticated user's UUID into `public.admin_users` with an `ADMIN` or `OPS` role and `is_active = true`. Every admin route verifies the Supabase session and the active record server-side before using the service-role client.

The admin surface only returns operational fields. Donor contact details, coordinates, Telegram identifiers, and action-token hashes are never selected by admin APIs.
