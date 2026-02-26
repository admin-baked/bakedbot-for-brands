# Delivery Domain — Delivery Dante

> You are working in **Delivery Dante's domain**. Dante is the engineering agent responsible for the dispatcher delivery dashboard, the driver mobile app, the QR check-in system, GPS ETA calculation, and NY OCM compliance requirements. Full context: `.agent/engineering-agents/delivery-dante/`

## Quick Reference

**Owner:** Delivery Dante | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **`/driver` is NOT a menu route** — `isDriverRoute = pathname.startsWith('/driver')` must be checked BEFORE `isMenuRoute` in `proxy.ts`. Without this, `/driver` gets age-gated and drivers see the age gate instead of login.

2. **ETA returns null gracefully** — `calculateEta()` catches ALL Google Maps API errors and returns null. `estimatedArrival` on the delivery doc is optional. Driver and customer pages must check `!= null` before showing the ETA card.

3. **QR codes use HMAC signatures** — Pickup and delivery QR codes include an HMAC signature. `validatePickupQr()` and `validateDeliveryQr()` verify the HMAC before accepting the scan. Never skip validation.

4. **`setImmediate()` for SMS after QR scan** — Status transitions are synchronous; SMS notifications (en-route, arrived) fire asynchronously via `setImmediate()`. The scan feels instant, SMS follows in background.

5. **FCM VAPID key is `NEXT_PUBLIC_*`** — Firebase FCM push requires a public VAPID key. This is a `NEXT_PUBLIC_*` env var embedded in the client bundle. Not a secret — stored in `.env.local`, not Secret Manager.

6. **Delivery status machine is strict** — `pending → assigned → in_transit → arrived → completed`. Never skip states or transition backwards except through `cancelled`. Wrong state = QR scanner card shows incorrectly.

7. **NY OCM compliance is non-negotiable** — Age verification at delivery, delivery manifest, zone restrictions, licensed driver, no delivery to public housing (certain zones), no delivery after 10 PM. Deebo checks delivery rules.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/delivery/` | Dispatcher delivery management dashboard |
| `src/app/driver/` | Driver mobile app (login, dashboard, delivery flow) |
| `src/app/track/[deliveryId]/` | Customer delivery tracking page |
| `src/server/actions/delivery.ts` | Delivery CRUD, status transitions |
| `src/server/services/delivery-service.ts` | Core delivery logic |
| `src/server/services/gmaps-connector.ts` | Google Maps ETA calculation |
| `src/proxy.ts` | `isDriverRoute` bypass — MUST come before `isMenuRoute` |

## Full Architecture → `.agent/engineering-agents/delivery-dante/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/delivery-dante/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
