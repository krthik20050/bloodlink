# BloodLink

BloodLink coordinates a blood request with nearby, compatible, opted-in donors. It is not a blood bank, medical-clearance system, or public donor directory.

## Run locally

1. Copy `.env.example` to `.env.local` and keep both mock flags true.
2. Run `pnpm install` and `pnpm dev`.
3. Open `/donor` to register a demo donor and `/request` to create a request and start wave 1.
4. Run `pnpm test` for deterministic-rule tests.

## Architecture

Next.js App Router route handlers call separate compatibility, eligibility, geolocation, matching, notification and match-lifecycle services. The local demo uses an in-memory store; use the included Supabase migration and a server-side adapter for persistence. Telegram uses a webhook and opaque callback tokens. Mock mode never sends a real notification.

## Configuration and deployment

All used variables are listed in `.env.example`. Never expose `SUPABASE_SERVICE_ROLE_KEY` or Telegram tokens to browsers. Apply `supabase/migrations/0001_bloodlink.sql` to the target project, configure RLS policies alongside your authentication provider, then deploy to Vercel, Railway, or Render with HTTPS webhook URLs. Production requires real Telegram and Supabase adapters, rate limiting, and authenticated request ownership before accepting public traffic.

See `docs/architecture.md`, `docs/matching-rules.md`, and `docs/security.md` for lifecycle, privacy, rules, security and scaling boundaries. Future providers can implement the messaging and blood-bank interfaces without changing matching rules.
