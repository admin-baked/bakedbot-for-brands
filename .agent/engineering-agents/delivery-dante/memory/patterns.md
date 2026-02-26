# Delivery Dante — Patterns & Gotchas

## Critical Rules

### Rule 1: `/driver` must bypass age gate BEFORE isMenuRoute
```typescript
// src/proxy.ts — proxy branch order is strict:

// ✅ CORRECT ORDER
const isMetaPath = checkMeta(pathname);
if (isMetaPath) return NextResponse.next();

const isDriverRoute = pathname.startsWith('/driver');
if (isDriverRoute) return NextResponse.next();  // no age gate, no menu redirect

const isMeetRoute = hostname.startsWith('meet.');
if (isMeetRoute) { /* rewrite */ }

const isMenuRoute = /^\/[^/]+$/.test(pathname);  // matches /thrivesyracuse etc.
// ...

// ❌ WRONG ORDER — /driver matches isMenuRoute regex and gets age-gated
const isMenuRoute = /^\/[^/]+$/.test(pathname);
if (isMenuRoute) { /* age gate */ }
// isDriverRoute never reached for '/driver' path
```

### Rule 2: ETA null check before rendering
```typescript
// ✅ CORRECT — ETA card only when estimatedArrival is set
{delivery.status === 'in_transit' && delivery.estimatedArrival != null && (
  <ETACard estimatedArrival={delivery.estimatedArrival} />
)}

// ❌ WRONG — crashes when calculateEta() returns null (Google Maps failure)
{delivery.status === 'in_transit' && (
  <ETACard estimatedArrival={delivery.estimatedArrival} />  // undefined prop
)}
```

### Rule 3: setImmediate() for SMS — never await in status transition
```typescript
// ✅ CORRECT — status update is synchronous; SMS is fire-and-forget
await delivery.ref.update({ status: 'in_transit', updatedAt: now });

setImmediate(async () => {
  const eta = await calculateEta(driverLoc, customerLoc);
  if (eta) await delivery.ref.update({ estimatedArrival: eta.arrivalTime });
  await sendEnRouteSMS(customer.phone, eta?.durationMinutes);
});

return { success: true };  // immediate return, driver sees scan confirmed

// ❌ WRONG — makes driver wait for SMS + ETA calculation (5-10s lag)
await delivery.ref.update({ status: 'in_transit' });
const eta = await calculateEta(driverLoc, customerLoc);
await sendEnRouteSMS(customer.phone, eta?.durationMinutes);
return { success: true };
```

### Rule 4: HMAC verification before accepting QR scan
```typescript
// ✅ CORRECT — verify signature before advancing status
async function validatePickupQr(qrData: string, orgId: string) {
  const { deliveryId, type, secret } = JSON.parse(qrData);
  const expectedHmac = generateHmac(deliveryId, process.env.QR_HMAC_SECRET);
  if (secret !== expectedHmac) throw new Error('Invalid QR code');
  if (type !== 'pickup') throw new Error('Wrong QR type');
  // ... proceed with status transition
}

// ❌ WRONG — accepting any QR scan without verification
async function validatePickupQr(qrData: string) {
  const { deliveryId } = JSON.parse(qrData);  // no HMAC check = forgeable
  await advanceStatus(deliveryId, 'in_transit');
}
```

### Rule 5: FCM VAPID key is NEXT_PUBLIC_*, not a GCP secret
```
// In .env.local (NOT apphosting.yaml secrets):
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNtc...abc123

// ✅ Use in client component directly:
const token = await getToken(messaging, {
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
});

// ❌ Don't try to access this from GCP Secret Manager:
// It must be NEXT_PUBLIC_* to be bundled in the client
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Driver sees age gate at `/driver` | `isDriverRoute` check missing or after `isMenuRoute` | Move `isDriverRoute` check BEFORE `isMenuRoute` in proxy.ts |
| ETA card crashes on load | `delivery.estimatedArrival` is null/undefined | Add `!= null` check before rendering ETA card |
| Driver scan hangs for 10+ seconds | ETA calculation awaited synchronously | Move ETA + SMS to `setImmediate()` |
| QR scan accepted for wrong delivery | No HMAC verification | Add `validatePickupQr()` / `validateDeliveryQr()` before status transition |
| FCM permission denied silently | NEXT_PUBLIC_FIREBASE_VAPID_KEY missing from .env.local | Add to .env.local (not Secret Manager) |
| Delivery tracker shows wrong step | Status transition skipped a state | Status machine is strict — can't jump from assigned to arrived |
| ETA shows old time after driver stops | ETA not refreshed during in_transit | Schedule ETA refresh every 5 minutes while status = 'in_transit' |

---

## NY OCM Delivery Compliance Quick Reference

```
Legal delivery window: 10 AM – 10 PM (local time)
  → Check at order creation AND at dispatch
  → Block if outside window

Prohibited zones:
  → Public housing developments
  → School zones (within 500 feet)
  → Check via delivery_zones/{orgId}/zones/ Firestore docs

Required at delivery:
  → Driver ID verification (must be licensed)
  → Customer age verification (scan state ID)
  → Delivery manifest signed
  → All logged with GPS coordinates + timestamp
```

---

*Patterns version: 1.0 | Created: 2026-02-26*
