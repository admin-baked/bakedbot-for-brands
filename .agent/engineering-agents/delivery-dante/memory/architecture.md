# Delivery Dante — Architecture

## Overview

Delivery Dante owns the NY OCM-compliant cannabis delivery system: dispatcher dashboard, driver mobile app, QR-based check-in at both pickup and delivery, GPS ETA from Google Maps, and customer tracking.

---

## 1. Delivery Status Machine

```
Strict state machine — transitions are one-way:

  pending → assigned → in_transit → arrived → completed
                                              ↑ auto-completes after timeout
  (any state) → cancelled

State transitions:
  pending → assigned:     Dispatcher assigns driver in active-deliveries-tab.tsx
  assigned → in_transit:  Driver QR pickup scan at dispensary counter
  in_transit → arrived:   Driver QR delivery scan at customer door
                          OR "I've Arrived" fallback button in action bar
  arrived → completed:    Dispatcher confirms, or auto-completes after timeout

Status stored on: tenants/{orgId}/deliveries/{id}.status
```

---

## 2. QR Check-In System

### Dispatcher Side (assigned status)
```
active-deliveries-tab.tsx:
  → Shows 80px QR image for each 'assigned' delivery
  → Label: "Show to driver at counter"
  → QR encodes: { deliveryId, type: 'pickup', secret: hmac }
  → HMAC prevents forged QR codes
```

### Driver Pickup (assigned status)
```
/driver/delivery/[id] page:
  → Shows QrScanner card when status = 'assigned'
  → Driver scans dispensary QR
  → validatePickupQr(qrData) verifies HMAC
  → On valid scan:
    1. (synchronous) Update status: assigned → in_transit
    2. (setImmediate) calculateEta(driverLocation, customerLocation)
    3. (setImmediate) sendEnRouteSMS(customer.phone, estimatedArrival)
```

### Driver Delivery (in_transit status)
```
/driver/delivery/[id] page:
  → Shows QrScanner card when status = 'in_transit'
  → Customer door QR (generated for customer's address)
  → validateDeliveryQr(qrData) verifies HMAC
  → On valid scan:
    1. (synchronous) Update status: in_transit → arrived
    2. (setImmediate) sendArrivedSMS(customer.phone)
  → Fallback: "I've Arrived" button also advances to arrived
```

---

## 3. ETA Calculation

```typescript
// src/server/services/gmaps-connector.ts
async function calculateEta(
  driverLocation: LatLng,
  customerLocation: LatLng
): Promise<EtaResult | null> {
  // Returns null gracefully if:
  //   - GOOGLE_MAPS_API_KEY missing or invalid
  //   - Rate limit hit
  //   - Any other API error
  // NEVER throws — callers don't need try/catch
}

// Display rules:
// Driver page: shows blue ETA card when status = 'in_transit' AND estimatedArrival != null
// Customer tracking: shows green ETA block in Step 3 when estimatedArrival != null
// Both check != null before rendering — ETA is always optional

// API key secret: GOOGLE_MAPS_API_KEY@2 (version 2 = real key)
// Restricted to: directions-backend, distance-matrix-backend, geocoding-backend
```

---

## 4. Driver Mobile App

```
Route: /driver → redirect → /driver/login
  → isDriverRoute = pathname.startsWith('/driver')
  → MUST be checked BEFORE isMenuRoute in proxy.ts
  → Without this: /driver matches /^\\/[^/]+$/ → age gate → 404

Pages:
  /driver/login     → Firebase Auth, role must = 'driver'
  /driver/dashboard → List of deliveries assigned to driver
                     ← FCM push notifications delivered here
                     ← DriverFcmRegistrar component requests permission
  /driver/delivery/[id] → Full delivery detail with QR scanner

FCM Push Notifications:
  DriverFcmRegistrar in /driver/dashboard:
    1. Requests notification permission
    2. Gets FCM token via getToken(messaging, { vapidKey })
    3. Saves token to driver Firestore doc
    4. Receives: new delivery assigned, status updates

  VAPID key: NEXT_PUBLIC_FIREBASE_VAPID_KEY (public env var, not a secret)
  → In .env.local, NOT GCP Secret Manager
  → Must be NEXT_PUBLIC_* for client bundle
```

---

## 5. Customer Tracking Page

```
/track/[deliveryId]

Public page (no auth required):
  → Reads tenants/{orgId}/deliveries/{deliveryId}
  → Security: only reads non-sensitive fields (status, estimatedArrival)
  → Real-time updates via Firestore onSnapshot

3-step progress:
  Step 1 (assigned):    "Your order is being prepared"
  Step 2 (in_transit):  "Your driver is on the way"
  Step 3 (arrived):     Green ETA block if estimatedArrival set
                        "Your driver has arrived!"
  Completed:            Confirmation screen

SMS updates:
  → "Your driver is en route, ETA: X minutes" (on in_transit)
  → "Your driver has arrived" (on arrived)
```

---

## 6. NY OCM Compliance Requirements

```
NY Office of Cannabis Management delivery rules:
  ✓ Age verification at delivery (driver checks ID)
  ✓ Delivery manifest (what's in the vehicle — printed at dispatch)
  ✓ Zone restrictions (cannot deliver to public housing, certain zones)
  ✓ Driver must have valid cannabis delivery license
  ✓ No delivery after 10 PM
  ✓ All deliveries logged with timestamp + location

Deebo integration:
  → src/server/services/deebo/ contains ny-retail.json rule pack
  → Delivery-specific rules in the NY section
  → Deebo can gate order creation if delivery not compliant

Zone restrictions:
  → delivery_zones/{orgId}/zones/ Firestore collection
  → Zone type: 'allowed' | 'restricted' | 'prohibited'
  → Google Maps geocoding resolves customer address to zone
```

---

*Architecture version: 1.0 | Created: 2026-02-26*
