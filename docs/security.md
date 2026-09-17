# Security model

Route handlers validate JSON with Zod. When Supabase is configured, routes require a verified bearer token, scope donor and request operations to the authenticated owner, and require request ownership before matching. Donor contact fields are omitted from lists and only returned after a valid, owner-bound acceptance. Notification tokens are sent only through Telegram and stored as SHA-256 hashes; the matching response never returns them. The Telegram webhook checks its secret in real mode. Demo mode intentionally bypasses external auth and is for local use only.

Apply migrations `0001`–`0003` in order. RLS policies use `auth.uid()` against `donors.user_id` and `blood_requests.requester_id`; the service-role key bypasses RLS and must remain server-only. Google Auth uses Supabase's `/auth/v1/callback`, while the app redirect URL must be allow-listed in Supabase. Raktkosh is not integrated, and mock blood-bank results are not real availability. Rate limiting, audit logging, a persistent Supabase repository, and verified Telegram identity binding remain required before public deployment.

Threat controls: no public donor-search API; compatibility is server-side; a serialized acceptance critical section prevents two donors claiming one request; secrets are environment-only; and structured logs do not contain tokens or secrets.
