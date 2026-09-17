# Security model

Route handlers validate JSON with Zod. Donor contact fields are omitted from the donor list and only returned after a valid acceptance. The Telegram webhook checks its secret in real mode; callback action tokens are opaque UUIDs and validated server-side. Production persistence must keep service-role credentials server-only and enforce Supabase RLS. Rate limiting and authenticated ownership checks are integration points required before public deployment.

Threat controls: no public donor-search API; compatibility is server-side; a serialized acceptance critical section prevents two donors claiming one request; secrets are environment-only; and structured logs do not contain tokens or secrets.
