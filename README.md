# BloodLink

BloodLink coordinates a blood request with nearby, compatible, opted-in donors. It is not a blood bank, medical-clearance system, or public donor directory.

## Run locally

1. Copy `.env.example` to `.env.local` and keep both mock flags true. This runs the intentionally non-persistent demo store.
2. Run `pnpm install` and `pnpm dev`.
3. Open `/donor` to register a demo donor and `/request` to create a request and start wave 1. Demo routes use a local demo identity; do not expose this mode publicly.
4. Run `pnpm test` for deterministic-rule tests.

## Architecture

Next.js App Router route handlers call separate compatibility, eligibility, geolocation, matching, notification and match-lifecycle services. Demo mode uses an in-memory store; production persistence is not wired yet and requires a server-only Supabase repository. When Supabase is configured, API routes require a verified bearer token and scope donor/request reads and writes to the authenticated owner. Telegram uses a secret-validated webhook and opaque callback tokens; mock mode never sends a real notification.

## Configuration and deployment

All used variables are listed in `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or Telegram tokens to browsers. Apply migrations `0001` through `0003` to the target project, enable Supabase Auth, and configure RLS policies before deploying. For Google sign-in, add the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) in Google Cloud Console, add the same provider in Supabase Auth, and allow the deployed app URL plus `/auth/callback` in Supabase redirect URLs. Raktkosh is not integrated: the displayed blood-bank result is explicitly mock data and must not be treated as inventory. Deploy only after wiring the Supabase repository, real blood-bank adapter, rate limiting, monitoring, and HTTPS Telegram webhook; this repository is not production-ready.

See `docs/architecture.md`, `docs/matching-rules.md`, and `docs/security.md` for lifecycle, privacy, rules, security and scaling boundaries. Future providers can implement the messaging and blood-bank interfaces without changing matching rules.
