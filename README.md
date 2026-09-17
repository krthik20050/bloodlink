# BloodLink

BloodLink is a Telegram-first blood-donor coordination application. It helps a person create a blood request, checks compatible opted-in donors nearby, and sends focused Telegram notifications. It is **not** a blood bank, a medical-clearance system, or a public donor directory.

## Product flow

### Requester

1. Sign in with Supabase Auth.
2. Open **Request blood**.
3. Choose blood group, units, urgency, and a nearby hospital.
4. Allow browser location access. The browser supplies coordinates; the user does not type them.
5. BloodLink checks the configured e-RaktKosh adapter for explicitly available stock.
6. If no stock is explicitly available, the request proceeds to compatible-donor matching.
7. The matching lifecycle evaluates compatibility, donation interval, consent, availability, radius, cooldown, and prior responses.

### Donor

Donors can register on the website or directly in Telegram:

1. Name and contact email
2. Blood group
3. Last donation date
4. Location permission or Telegram location sharing
5. Consent to receive relevant notifications

The donor receives a Telegram deep link or can start the Telegram conversation with `/donate`. Notification buttons let the donor accept or decline. Contact exchange is enabled only after an accepted match.

## Architecture

```mermaid
flowchart LR
  Browser[Mobile-first Next.js UI] --> Auth[Supabase Auth]
  Browser --> Routes[Next.js route handlers]
  Telegram[Telegram Bot API] --> Webhook[/api/telegram/webhook]
  Webhook --> TelegramFlow[Telegram conversation state]
  Routes --> Repository[Server-only Supabase repository]
  Repository --> Database[(Supabase PostgreSQL)]
  Routes --> Hospitals[OpenStreetMap Overpass adapter]
  Routes --> Raktkosh[e-RaktKosh adapter]
  Routes --> Matching[Compatibility and matching rules]
  Matching --> Notifications[Telegram notification adapter]
  Notifications --> Telegram
  Vercel[Vercel] --> Browser
  Vercel --> Routes
```

### Runtime layers

- `app/` contains pages, auth callbacks, and HTTP route handlers.
- `lib/domain.ts` contains the core domain types and blood-group vocabulary.
- `lib/compatibility.ts`, `lib/eligibility.ts`, `lib/geolocation.ts`, and `lib/matching.ts` contain deterministic rules.
- `lib/supabase/` contains browser, SSR, admin, authentication, and persistence adapters.
- `lib/telegram.ts` contains the Telegram Bot API adapter.
- `lib/raktkosh.ts` contains the official blood-availability adapter.
- `lib/hospitals.ts` contains the nearby-hospital lookup adapter.
- `lib/match-lifecycle.ts` and `lib/notifications.ts` coordinate match acceptance and donor notification delivery.
- `supabase/migrations/` is the database schema and RLS history.
- `tests/` contains deterministic rule, Telegram date, and interaction tests.

### Important persistence boundary

Donor and request creation currently use `lib/supabase/repository.ts`. Telegram conversation state is stored in the `telegram_conversations` table. The matching route and legacy notification queue still reference the in-memory store in parts of the current branch. That is a known migration boundary: matching and notification persistence must be completed before treating the deployment as fully durable across serverless instances.

## Telegram integration

The webhook is:

```text
https://bloodlink-ebon.vercel.app/api/telegram/webhook
```

The webhook:

1. Validates `TELEGRAM_WEBHOOK_SECRET` outside mock mode.
2. Handles `/start`, `/donate`, `/help`, `/status`, `/cancel`, and `/disconnect`.
3. Presents buttons for donor, requester, and help paths.
4. Stores donor-registration conversation state in Supabase.
5. Uses Telegram location sharing instead of typed coordinates.
6. Uses blood-group and yes/no buttons where possible.
7. Accepts donor dates in `DD/MM/YYYY`, normalizes them to ISO `YYYY-MM-DD`, and rejects impossible dates.
8. Sends match notifications with callback buttons.

Telegram command/menu setup is performed lazily when the first real message arrives. The bot username is configured through `TELEGRAM_BOT_USERNAME`.

## Supabase

Supabase is used for:

- Email/password, magic-link, and Google OAuth
- PostgreSQL persistence
- Server-side repository operations
- Row Level Security policies
- Auth session cookies for the Next.js app
- Telegram conversation state

The service-role key is used only by server-side repository code and bypasses RLS. Browser code uses the publishable/anon key and SSR cookies. Never expose `SUPABASE_SERVICE_ROLE_KEY` to a client.

Apply migrations in order:

```text
supabase/migrations/0001_bloodlink.sql
supabase/migrations/0002_supabase_auth.sql
supabase/migrations/0003_rls_policies.sql
supabase/migrations/0004_telegram_conversations.sql
```

Configure Supabase Auth redirect URLs:

```text
http://localhost:3000/auth/callback
https://bloodlink-ebon.vercel.app/auth/callback
```

For Google Cloud OAuth, the authorized redirect URI is the Supabase callback, not the app callback:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

## External integrations

### Vercel

Vercel hosts the Next.js application and route handlers. It is used because it provides simple Next.js deployments, environment-variable management, serverless route execution, and the production alias used by Supabase and Telegram callbacks.

Deploy:

```bash
pnpm install
pnpm build
vercel --prod
```

### e-RaktKosh

`lib/raktkosh.ts` calls the configured official e-RaktKosh nearby-stock endpoint from the server only. It:

- Allows only the official HTTPS host and expected path
- Requires numeric state and district codes
- Uses a timeout and short cache
- Validates the response shape
- Returns only rows explicitly reporting availability
- Fails closed to an empty result

The endpoint is not a documented public API contract. Verify the endpoint, query parameters, and state/district codes against the target deployment before relying on it operationally.

### Nearby hospitals

`lib/hospitals.ts` queries the public OpenStreetMap Overpass endpoint for named hospitals near the browser-provided location. Results are validated, sorted by distance, cached briefly, and capped. An empty response is shown as empty; the application does not invent hospital names.

## Environment

Copy `.env.example` to `.env.local` for local work. Use real values only in local secret storage or Vercel environment variables.

| Variable | Used by | Sensitive |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Deep links and app redirects | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server Supabase clients | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and SSR Auth | Public client key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Compatibility fallback | Public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only repository | **Yes** |
| `TELEGRAM_BOT_TOKEN` | Server-only Telegram adapter | **Yes** |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook validation | **Yes** |
| `TELEGRAM_BOT_USERNAME` | Donor deep links | No |
| `RAKTKOSH_ENDPOINT` | Server-only stock adapter | No |
| `RAKTKOSH_STATE_CODE` | Raktkosh query | No |
| `RAKTKOSH_DISTRICT_CODE` | Raktkosh query | No |
| `MOCK_TELEGRAM` | Local integration mode | No |

Never commit `.env.local`, OAuth client secrets, Supabase service-role keys, Telegram tokens, Vercel credentials, database dumps, generated build output, or local package stores.

## Local development

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

The development server is available at `http://localhost:3000`.

## Repository map

```text
app/
  auth/                         Supabase Auth UI and callback
  api/donors/                   Donor registration and profile reads
  api/requests/                 Request creation and owned request reads
  api/requests/[id]/match/      Matching entry point
  api/telegram/webhook/         Telegram updates and conversations
  api/hospitals/                Nearby hospital lookup
  donor/                        Donor registration UI
  request/                      Requester UI
  page.tsx                      Product landing page
lib/
  domain.ts                     Domain types and blood groups
  matching.ts                   Deterministic donor selection
  match-lifecycle.ts            Accept/decline state transitions
  notifications.ts              Notification queue
  telegram.ts                   Telegram Bot API adapter
  raktkosh.ts                   Official stock adapter
  hospitals.ts                  Nearby hospital adapter
  supabase/                     Auth, SSR, admin, and repository modules
supabase/migrations/            Ordered schema and RLS changes
tests/                          Deterministic and Telegram tests
docs/                           Architecture, rules, security, and operations notes
```

## Current limitations and next hardening work

- Complete the migration from the in-memory matching/notification paths to Supabase persistence.
- Add rate limiting and webhook update idempotency.
- Verify e-RaktKosh endpoint behavior and operational permission before production dependence.
- Add an account/settings page and phone contact preference without exposing donor contact data.
- Add integration tests against a disposable Supabase project.
- Configure monitoring and alerting for failed Telegram deliveries and external-provider timeouts.

See [`docs/architecture.md`](docs/architecture.md), [`docs/security.md`](docs/security.md), and [`docs/matching-rules.md`](docs/matching-rules.md).
