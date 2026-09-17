# Matching rules

BloodLink uses red-cell compatibility only. Compatibility is centralized in `lib/compatibility.ts`. The prototype interval policy is configurable in `lib/matching-config.ts` and is a system filter based on donor-provided information, not medical clearance.

Hard filters exclude incompatible groups, recent recorded donation, no consent, paused status, an outside-radius location, cooldown, prior contact/decline, or an active match. Eligible candidates are ordered by distance. Waves are configuration-driven: 5 donors within 3 km, then 10 within 5 km, then 20 within 10 km. A valid acceptance closes a one-unit request and cancels all other pending notifications.

The policy is implemented in `lib/matching.ts` and rechecked by `lib/match-lifecycle.ts`. The current migration to fully persisted matching is incomplete: the matching entry point and parts of the notification queue still use the legacy in-memory store. Do not interpret a successful local/demo run as proof of serverless durability until that path is moved to `lib/supabase/repository.ts`.
