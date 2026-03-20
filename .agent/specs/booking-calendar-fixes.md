# Task Spec: Booking Calendar & Meeting Room Fixes

**Date:** 2026-03-20
**Requested by:** User (Email/Audit)
**Spec status:** 🟡 Draft

---

### 1. Intent (Why)

Restore reliability to the booking follow-up flow and video meeting connectivity to ensure a premium executive experience.

---

### 2. Scope (What)

**Files affected:**
- `src/server/actions/executive-calendar.ts` — Update follow-up query status filter.
- `src/server/services/executive-calendar/livekit.ts` — Normalize URL and stable identity.
- `src/app/meet/[roomId]/page.tsx` — Use normalized LiveKit URL.
- `src/server/services/executive-calendar/google-calendar.ts` — Fix Redirect URI.
- `src/app/api/cron/meeting-followup/route.ts` — Enhanced logging.

**Files explicitly NOT touched:**
- `src/app/book/[slug]/page.tsx` — Booking page layout is fine.
- `src/server/services/executive-calendar/availability.ts` — Availability logic is correct.

**Estimated diff size:** ~40 lines

---

### 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | No | Uses existing auth patterns. |
| Touches payment or billing? | No | |
| Modifies database schema? | No | |
| Changes infra cost profile? | No | |
| Modifies LLM prompts or agent behavior? | No | Uses existing Craig prompt. |
| Touches compliance logic? | No | |
| Adds new external dependency? | No | |

**Escalation needed?** No

---

### 4. Implementation Plan

1. **Fix Follow-up Cron Filter**: Update `getMeetingsNeedingFollowUp` in `executive-calendar.ts` to include `completed` status.
2. **Normalize LiveKit URL**: Update `getLiveKitConfig` in `livekit.ts` and use it in `page.tsx`.
3. **Stabilize Participant Identity**: Remove `Date.now()` from `generateAccessToken` in `livekit.ts`.
4. **Correct GCal Redirect URI**: Update `REDIRECT_URI` in `google-calendar.ts` to `https://bakedbot.ai/api/auth/google/callback`.
5. **Add Cron Logging**: Add diagnostic logs to the follow-up route.

---

### 5. Test Plan

**Unit tests:**
- `tests/server/executive-calendar/follow-up.test.ts` (NEW) — verifies `getMeetingsNeedingFollowUp` returns both confirmed and completed bookings.

**Manual smoke test:**
1. Book meeting -> Join room -> Verify camera.
2. End meeting -> Mark completed -> Run cron -> Verify email logs.
3. Check GCal connection URL in dashboard settings.

---

### 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes |
| Feature flag? | No |
| Data migration rollback needed? | No |
| Downstream services affected? | None |

---

### 7. Success Criteria

- [ ] `completed` meetings receive follow-up emails via cron.
- [ ] `meet.bakedbot.ai` rooms connect to LiveKit consistently.
- [ ] No "Invalid Redirect URI" errors during GCal connection.
