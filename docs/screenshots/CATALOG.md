# BakedBot Screenshot Catalog

> Reference for all agents. Update this file when capturing new screenshots.
> Screenshots live in `docs/screenshots/` and are committed to git.

## How to Use

Agents reference screenshots by path: `docs/screenshots/<filename>.png`
When building HeyGen videos, marketing content, or onboarding materials,
use these as the source of truth for current UI state.

## How to Update

After shipping a new feature:
1. Capture the screenshot (browser DevTools, Playwright, or manual)
2. Save to `docs/screenshots/` with a descriptive kebab-case name
3. Update this catalog with the entry
4. Commit with `docs: update screenshot catalog`

---

## Current Screenshots

### Homepage & Public Pages

| File | Description | Viewport | Last Updated |
|------|-------------|----------|--------------|
| `homepage-hero.png` | Homepage hero section — "Turn traffic into repeat revenue" with CTA, nav, stats bar | Desktop 1440px | 2026-04-10 |

### Mobile / CEO

| File | Description | Viewport | Last Updated |
|------|-------------|----------|--------------|
| `ceo-booking-mobile.png` | CEO booking page — Martez profile, Quick Connect / Discovery Call / Deep Dive options | Mobile 390px | 2026-04-09 |
| `super-admin-login-mobile.png` | Super Admin login — Google + Email auth, dark theme | Mobile 390px | 2026-04-09 |
| `livekit-video-call-mobile.png` | LiveKit video call interface — A'Dazi Discover session, Start Audio button | Mobile 390px | 2026-04-09 |

### Dashboard (NEEDED)

| File | Description | Status |
|------|-------------|--------|
| `dashboard-overview.png` | Main dashboard with briefing cards | MISSING |
| `dashboard-products.png` | Products page with briefing cards, score badges | MISSING |
| `dashboard-customers.png` | Customer list / CRM view | MISSING |
| `dashboard-campaigns.png` | Campaign builder / SMS+Email | MISSING |
| `dashboard-competitive-intel.png` | Competitive intelligence dashboard | MISSING |
| `dashboard-menu-editor.png` | Menu page with preview, locations, themes tabs | MISSING |
| `dashboard-creative-center.png` | Creative center with quick starts and templates | MISSING |
| `dashboard-inbox.png` | Agent inbox / chat threads | MISSING |
| `dashboard-settings.png` | Org settings (email, billing, team) | MISSING |

### Tablet / Check-In (NEEDED)

| File | Description | Status |
|------|-------------|--------|
| `tablet-welcome.png` | Tablet kiosk welcome screen — "Check In" / "Join Rewards" | MISSING |
| `tablet-returning.png` | Returning customer lookup screen | MISSING |
| `tablet-success.png` | Check-in success with QR code | MISSING |
| `tablet-budtender.png` | Budtender recommendations screen with voice | MISSING |

### Onboarding (NEEDED)

| File | Description | Status |
|------|-------------|--------|
| `onboarding-connect-pos.png` | Connect POS / Alleaves integration step | MISSING |
| `onboarding-brand-guide.png` | Brand guide extraction step | MISSING |
| `onboarding-complete.png` | Onboarding complete / dashboard redirect | MISSING |

---

## Broken Screenshots (from HeyGen script)

The following were captured by `scripts/heygen/generate-videos.mjs` but hit wrong URLs
and show "Brand Not Found" error pages. **Do not use these — they need to be recaptured.**

Located in `scripts/heygen/screenshots/` (NOT in this catalog):
- `checkin-setup.png` — Brand Not Found (was hitting `/check-in` brand route)
- `competitive-intel.png` — Brand Not Found (was hitting `/competitive-intelligence`)
- `connect-menu.png` — Brand Not Found (was hitting `/features`)
- `content-calendar.png` — Brand Not Found (was hitting `/creative`)
- `creative-center.png` — Brand Not Found (was hitting `/creative`)
- `inbox-tour.png` — Brand Not Found (was hitting `/creative`)
- `link-dispensary.png` — Brand Not Found (was hitting `/features`)
- `qr-training.png` — Brand Not Found (was hitting `/check-in`)
- `welcome-playbook.png` — Brand Not Found (was hitting `/creative`)
