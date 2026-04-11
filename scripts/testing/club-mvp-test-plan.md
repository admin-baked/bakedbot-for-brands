# BakedBot Club MVP — Test Plan

> Base URL: `https://bakedbot.ai`
> Test org: `org_thrive_syracuse`
> Test phone: `3126840522` (Martez Test — 4 orders, 378 pts, 8 visits)

---

## 1. Mood Video Pre-Render Cache

**What changed:** Mood tap no longer renders a Remotion Lambda video inline (3-15s). Videos are pre-rendered and cached in Firestore, served instantly (<200ms).

### 1a. Trigger pre-render (run once after deploy)
```
GET /api/cron/mood-video-prerender?orgId=org_thrive_syracuse
```
- [ ] Returns 200 with `{ rendered: 7, skipped: 0, errors: [] }`
- [ ] Re-run: returns `{ rendered: 0, skipped: 7, errors: [] }` (cache hit)
- [ ] Force re-render: append `&force=true` — returns `rendered: 7` again

### 1b. Tablet mood tap (fast path)
```
/loyalty-tablet?orgId=org_thrive_syracuse
```
1. Enter phone `3126840522` → Continue
2. Select any mood (e.g., "Relaxed")
- [ ] Recommendations appear in <1s (was 3-15s)
- [ ] Video plays on the recommendation card
- [ ] Try all 7 moods — each should have a cached video

### 1c. Firestore verification
- [ ] `tenants/org_thrive_syracuse/mood_videos/` has 7 documents
- [ ] Each doc has: `moodId`, `videoUrl`, `brandHash`, `renderedAt`

---

## 2. Tablet PWA

**What changed:** Dedicated tablet manifest enables full-screen install + mic/camera permissions on Android.

### 2a. Install prompt
```
/loyalty-tablet?orgId=org_thrive_syracuse
```
Open in Chrome/Edge on Android tablet:
- [ ] Green install banner appears: "Install for full-screen mode + better mic access"
- [ ] Tap "Install" → app installs to home screen
- [ ] Banner does NOT appear if already installed (standalone mode)
- [ ] "Dismiss" hides the banner

### 2b. PWA behavior
- [ ] Installed app opens in standalone mode (no browser chrome)
- [ ] Orientation locked to portrait
- [ ] App name shows "BakedBot Check-In"
- [ ] Theme color is dark (#0f0f1a)

### 2c. Microphone access
- [ ] Voice search mic button works in installed PWA
- [ ] If mic was denied in browser, PWA install gives a fresh permission prompt
- [ ] "Tap to enable voice search" pill appears on recs step

---

## 3. Customer Club PWA (`/club`)

**What changed:** New customer-facing loyalty app with 4 screens. Planet Fitness-style membership experience.

### 3a. Home screen
```
/club?orgId=org_thrive_syracuse&phone=3126840522
```
- [ ] Page loads without errors
- [ ] Store name displayed (from brand theme)
- [ ] Points balance shown (should be 378 for test customer)
- [ ] Visit count displayed (should be 8)
- [ ] Tier badge visible
- [ ] Featured reward card shown
- [ ] "Open Pass" CTA navigates to /club/pass

### 3b. Pass screen
```
/club/pass?orgId=org_thrive_syracuse&phone=3126840522
```
- [ ] QR code renders (scannable)
- [ ] Code128 barcode renders below QR
- [ ] Member name displayed
- [ ] Tier + points shown
- [ ] Member code visible
- [ ] Brightness boost toggle works (screen brightens for scanning)
- [ ] Last check-in date shown

### 3c. Perks screen
```
/club/perks?orgId=org_thrive_syracuse&phone=3126840522
```
- [ ] "Available Now" section shows redeemable rewards
- [ ] "Coming Soon" section shows locked rewards
- [ ] Reward type icons display correctly
- [ ] "Expiring Soon" badge appears on rewards nearing expiration

### 3d. Profile screen
```
/club/profile?orgId=org_thrive_syracuse&phone=3126840522
```
- [ ] Name and email fields are editable
- [ ] Phone field is read-only (masked)
- [ ] SMS/email/push notification toggles work
- [ ] Favorite category chips display
- [ ] Save changes persists to Firestore

### 3e. Navigation
- [ ] Bottom nav shows 4 tabs: Home, Pass, Perks, Profile
- [ ] Active tab is highlighted
- [ ] Navigation preserves `orgId` and `phone` query params
- [ ] Safe-area inset padding works on notched devices

### 3f. Co-branding
- [ ] Header/branding shows "{Store Name} Club — Powered by BakedBot"
- [ ] Brand colors from org theme are applied

---

## 4. Event Processing Pipeline

**What changed:** Club events now flow through a trigger registry. 5 MVP triggers auto-execute actions.

### 4a. Trigger registry API
```
GET /api/v1/loyalty/triggers?orgId=org_thrive_syracuse
```
- [ ] Returns 5 triggers with id, eventType, label, layer
- [ ] Returns recent `trigger_executions` array

### 4b. Welcome bonus (enrollment trigger)
1. Create a new member via the check-in tablet (new phone number)
- [ ] `trigger_executions` doc created with triggerId `welcome_bonus`
- [ ] Member receives 50 welcome points
- [ ] Points ledger entry exists in Firestore

### 4c. Visit perk (5th visit)
1. Use a test member with 4 prior visits
2. Open a new visit session
- [ ] 5th visit triggers `fifth_visit_perk`
- [ ] $5 reward unlocked for the member
- [ ] Reward visible in Club PWA perks page

### 4d. Purchase points (transaction)
1. Complete a POS transaction via webhook:
```
POST /api/v1/integrations/pos/transactions/completed
```
- [ ] `transaction_completed` event emitted
- [ ] Points awarded based on totalCents (1 pt per dollar)
- [ ] Points ledger entry created
- [ ] Trigger execution logged

### 4e. Audit trail
- [ ] Every trigger execution writes to `tenants/{orgId}/trigger_executions/{id}`
- [ ] Each doc has: `triggerId`, `eventId`, `eventType`, `actions`, `executedAt`, `result`
- [ ] Failed triggers log errors but don't break the request flow (fire-and-forget)

---

## 5. Edge Cases & Error Handling

### 5a. No cached video
- [ ] If mood video cache is empty, recommendation still works (video field is undefined/null, no crash)

### 5b. Invalid org/phone on Club
```
/club?orgId=nonexistent&phone=0000000000
```
- [ ] Graceful loading state → shows empty/error state, no crash

### 5c. Concurrent trigger processing
- [ ] Two simultaneous events for same member don't create duplicate points
- [ ] Trigger executions have unique IDs

### 5d. Brand hash change detection
1. Update org brand colors in Firestore
2. Re-run mood video pre-render (without `--force`)
- [ ] Detects brand hash mismatch → re-renders videos
- [ ] New videos have updated branding

---

## Quick Smoke Test Checklist

For a fast pass, hit these 5 URLs and verify no errors:

1. [ ] `/api/cron/mood-video-prerender?orgId=org_thrive_syracuse` → 200 OK
2. [ ] `/loyalty-tablet?orgId=org_thrive_syracuse` → tablet loads, mood tap is fast
3. [ ] `/club?orgId=org_thrive_syracuse&phone=3126840522` → home screen with points
4. [ ] `/club/pass?orgId=org_thrive_syracuse&phone=3126840522` → QR + barcode render
5. [ ] `/api/v1/loyalty/triggers?orgId=org_thrive_syracuse` → 5 triggers returned
