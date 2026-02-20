# Production Spec: Delivery System (NY OCM)

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Money Mike (Retail Agent), Smokey (Budtender)
**Tier:** 3 — Supporting Systems

---

## 1. Feature Overview

Delivery System is the NY OCM-compliant cannabis delivery infrastructure for dispensaries, built in 6 phases for Thrive Syracuse pilot. Includes fulfillment selection (Pickup vs Delivery), zone-based pricing ($5-$12 by radius), address geocoding with real-time fee calculation, driver management (license validation, availability toggle), GPS tracking (30-second updates), driver PWA mobile app (`/driver/*`), customer public tracking page (`/track/[deliveryId]`), admin dispatch map, ID verification (4 ID types, 7 rejection codes), signature capture (HTML5 Canvas), photo capture (proof of delivery), and analytics dashboard (4 KPIs, driver leaderboard). Auto-assigns first available driver on delivery creation via Firestore transaction. All compliance docs encrypted in Firebase Storage. 40+ files, 2,000+ lines of code, zero TypeScript errors.

---

## 2. Current State

### Shipped ✅
- **Fulfillment selection**: Checkout flow with Pickup vs Delivery toggle (`src/components/checkout/fulfillment-selection.tsx`) (`memory/delivery-system-2026-02-17.md:14-18`)
- **Zone-based pricing**: Configurable delivery zones with radius-based fees ($5-$12), geocoding via Google Maps API (`src/components/checkout/delivery-address-form.tsx`) (`memory/delivery-system-2026-02-17.md:15-16`)
- **Delivery address form**: Address input, geocoding, time window selection, auto-creates delivery record on order confirmation (`memory/delivery-system-2026-02-17.md:17-18`)
- **Driver CRUD**: Add/edit/delete drivers with license validation (21+ age check via expiry), on/off duty toggle (`src/server/actions/driver.ts`) (`memory/delivery-system-2026-02-17.md:21-27`)
- **Admin dashboard**: `/dashboard/delivery` with 4 tabs (Active Deliveries, Drivers, Zones, Analytics), manual driver assignment for pending orders (`memory/delivery-system-2026-02-17.md:24-26`)
- **Driver PWA mobile app**: `/driver/*` pages with home screen install support, driver login (Firebase Auth), dashboard with active deliveries + stats (`memory/delivery-system-2026-02-17.md:29-36`)
- **GPS tracking**: Real-time driver location updates (30-second intervals), admin dispatch map with live pins, customer public tracking page (`/track/[deliveryId]`) (`memory/delivery-system-2026-02-17.md:32-35`)
- **ID verification**: OCM-compliant age verification (4 ID types: driver's license, passport, military, state ID), real-time age calculation, auto-reject if under 21, 7 rejection codes (no ID, under-age, expired, intoxicated, address mismatch, not present, refused) (`memory/delivery-system-2026-02-17.md:38-43`)
- **Signature capture**: HTML5 Canvas signature with touch + mouse support, minimum stroke validation (`memory/delivery-system-2026-02-17.md:42`)
- **Photo capture**: Camera-based proof of delivery, Firebase Storage encryption (`memory/delivery-system-2026-02-17.md:43-44`)
- **Analytics dashboard**: Performance KPIs (on-time %, avg delivery time, completion rate, customer satisfaction), color-coded scores (green 90%+, yellow 75%+, red below), driver leaderboard (top 5 with medals), period filtering (Today/Week/Month) (`memory/delivery-system-2026-02-17.md:47-51`)
- **Auto-assignment**: First available driver auto-assigned on delivery creation via Firestore transaction (prevents race conditions), manual reassignment in dispatch (`memory/delivery-system-2026-02-17.md:54-58`)
- **PWA manifest**: Home screen install support for driver app (`memory/delivery-system-2026-02-17.md:56`)

### Partially Working ⚠️
- **Batch delivery optimization**: `delivery_routes` collection exists but NO route optimizer (drivers take deliveries one at a time)
- **Customer satisfaction**: Analytics show customer satisfaction % but NO rating mechanism (placeholder data only)
- **Delivery notifications**: SMS/push notifications for status updates (en route, delivered) planned but NOT implemented
- **Driver performance scoring**: Leaderboard exists but scoring logic NOT finalized (uses placeholder on-time % only)
- **Zone configuration UI**: Zone editor in admin dashboard but NO geocoding validation (can create invalid zones)

### Not Implemented ❌
- **Real-time ETA calculation**: Public tracking page shows driver location but NO estimated arrival time
- **Driver app push notifications**: No background location tracking + push alerts for new assignments
- **Driver earnings tracking**: No per-delivery earnings, no daily/weekly totals for drivers
- **Tip handling**: No tip collection at delivery (cash only)
- **Multi-stop routes**: Drivers deliver one order at a time (no batching)
- **Return to dispensary tracking**: No detection of driver returning after delivery
- **Delivery history for customers**: Customers can't see past deliveries (no order history integration)
- **Contactless delivery**: No "leave at door" option with photo proof
- **Delivery insurance tracking**: No proof of insurance upload for drivers
- **Vehicle inspection**: No vehicle checklist before shift start
- **Temperature monitoring**: No cooler temp tracking for edibles/beverages

---

## 3. Acceptance Criteria

### Functional
- [ ] Customer can select Delivery at checkout and enter address with geocoding validation
- [ ] System calculates delivery fee based on zone (radius from dispensary) and shows fee before order confirmation
- [ ] Order confirmation auto-creates delivery record with pending status
- [ ] First available driver auto-assigned to new delivery via Firestore transaction
- [ ] Driver can log into mobile app and see assigned deliveries with customer address + order details
- [ ] Driver can update delivery status (accepted, en route, delivered) and GPS location updates every 30s
- [ ] Driver can capture ID verification (4 ID types), signature, and proof of delivery photo
- [ ] Customer can track delivery in real-time via public `/track/[deliveryId]` page (driver location + status)
- [ ] Admin can view dispatch map with live driver locations and delivery statuses
- [ ] Admin can manually reassign deliveries if driver unavailable
- [ ] Analytics dashboard shows on-time %, avg delivery time, completion rate per driver + org-wide

### Compliance / Security
- [ ] Driver license validation MUST check expiry date and auto-reject if < 21 years old
- [ ] ID verification MUST require one of 4 OCM-approved ID types
- [ ] Signature capture MUST have minimum stroke validation (prevent blank signatures)
- [ ] Proof of delivery photo MUST be encrypted in Firebase Storage (no public URLs)
- [ ] Delivery records MUST include compliance fields: `idType`, `idNumber`, `signature`, `photo`, `verifiedAt`
- [ ] Driver GPS location MUST NOT be exposed to customers until delivery accepted (privacy)
- [ ] Only org admin can access driver roster and delivery history (role-gated)

### Performance
- [ ] Delivery address geocoding completes in < 2s (Google Maps API)
- [ ] Delivery fee calculation completes in < 500ms (zone lookup + math)
- [ ] Driver assignment transaction completes in < 1s (Firestore atomic write)
- [ ] GPS location updates write to Firestore in < 500ms (every 30s interval)
- [ ] Public tracking page loads in < 1s (SSR with delivery data + Google Maps)
- [ ] Analytics dashboard loads in < 2s for orgs with < 100 deliveries/day

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No real-time ETA calculation | 🔴 Critical | Public tracking shows driver location but no "Arrives in 12 min" estimate |
| No batch delivery optimization | 🔴 Critical | Drivers take one order at a time — inefficient for high volume |
| No driver app push notifications | 🟡 High | Drivers must keep app open to see new assignments (no background alerts) |
| No customer delivery notifications | 🟡 High | No SMS/push alerts for "Driver en route" or "Delivered" |
| No tip handling | 🟡 High | Cash-only tips — no digital tip collection |
| No driver earnings tracking | 🟡 High | No per-delivery earnings, no weekly pay summaries |
| Customer satisfaction placeholder | 🟡 High | Analytics show satisfaction % but no actual rating mechanism |
| No zone geocoding validation | 🟡 High | Can create invalid zones (overlaps, gaps) with no validation |
| No contactless delivery | 🟢 Low | No "leave at door" option with photo proof |
| No delivery insurance tracking | 🟢 Low | No proof of insurance upload for drivers |
| No vehicle inspection checklist | 🟢 Low | No pre-shift vehicle safety check |
| No temperature monitoring | 🟢 Low | No cooler temp tracking for edibles/beverages |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| None | — | No tests exist for delivery system |

### Missing Tests (Required for Production-Ready)
- [ ] `delivery-zone-pricing.unit.test.ts` — validates fee calculation for given address + zone config
- [ ] `delivery-driver-assignment.integration.test.ts` — validates auto-assignment transaction (first available driver)
- [ ] `delivery-id-verification.unit.test.ts` — validates age calculation + rejection logic for 4 ID types
- [ ] `delivery-signature-capture.e2e.test.ts` — validates Canvas signature with minimum stroke validation
- [ ] `delivery-gps-tracking.integration.test.ts` — validates 30s GPS updates write to Firestore
- [ ] `delivery-public-tracking.e2e.test.ts` — validates customer can view real-time driver location
- [ ] `delivery-analytics.unit.test.ts` — validates on-time %, avg delivery time, completion rate calculations

### Golden Set Eval
Not applicable (Delivery is primarily operational — no LLM/agent behavior to test).

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore `deliveries` collection | Stores delivery records, GPS tracking, compliance docs | Delivery system completely unavailable |
| Firestore `drivers` collection | Stores driver roster, availability status | No drivers visible, no assignments possible |
| Firebase Auth | Driver login for mobile app | Drivers can't log in (app unusable) |
| Firebase Storage | Stores ID photos, signatures, proof of delivery | Compliance docs lost (OCM violation) |
| Orders system | Creates delivery record on order confirmation | No deliveries created (checkout broken) |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Google Maps Geocoding API | Converts address to lat/lng for zone lookup | Manual zone selection dropdown (less accurate) |
| Google Maps JavaScript API | Renders public tracking map + driver location | Text-only tracking ("Driver en route" status only) |

---

## 7. Degraded Mode

- **If Google Maps Geocoding API is down:** Delivery address form shows manual zone selection dropdown instead of auto-detection. Fees may be inaccurate if customer enters wrong zone.
- **If Google Maps JavaScript API is down:** Public tracking page shows text-only status updates ("Driver assigned", "En route", "Delivered"). No map, no real-time location.
- **If Firestore writes fail during GPS updates:** Driver location not updated on public tracking page. Last known location shown (stale data).
- **If Firebase Storage is down:** Driver can't upload ID photo, signature, or proof of delivery. Delivery completion blocked (OCM compliance failure).
- **If no drivers available:** Auto-assignment fails silently. Delivery stays in pending status. Admin must manually assign when driver comes online.
- **Data loss risk:** If driver completes delivery but Firestore write fails, delivery status stuck in "en route". Customer sees incomplete delivery. Mitigation: driver app should retry status update on network recovery.

---

## 8. Open Questions

1. **Real-time ETA calculation**: Should we use Google Maps Distance Matrix API ($$) or build simple distance ÷ avg speed formula?
2. **Batch delivery optimization**: Should we implement route optimizer in-house or integrate 3rd party (Onfleet, Circuit)?
3. **Driver earnings**: Should drivers get paid per delivery, per mile, or hourly? How to handle tips digitally?
4. **Customer satisfaction**: Should we send post-delivery SMS survey, or in-app rating?
5. **Multi-stop routes**: Should we batch deliveries by zone + time window, or keep one-at-a-time for simplicity?
6. **Contactless delivery**: Should we allow "leave at door" option, or require signature for OCM compliance?
7. **Driver insurance tracking**: Should we require proof of insurance upload + expiry validation, or trust drivers?
8. **Vehicle inspection**: Should we require daily vehicle checklist before shift start, or skip for MVP?
9. **Temperature monitoring**: Should we track cooler temps for edibles/beverages, or assume drivers use coolers correctly?
10. **Delivery notifications**: Should we send SMS (Blackleaf), push notifications (Firebase Cloud Messaging), or both?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on memory/delivery-system-2026-02-17.md |
