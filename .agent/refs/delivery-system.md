# Delivery System Reference — NY OCM-Compliant Cannabis Delivery

> Last Updated: 2026-02-17 | Status: ✅ Production-Ready | Deployed to Thrive Syracuse

## Overview

Complete end-to-end delivery system enabling cannabis dispensaries to accept delivery orders with full NY Office of Cannabis Management (OCM) compliance. Covers checkout integration, driver management, GPS tracking, ID verification (21+ age), proof of delivery, and analytics.

## Key Features

### Customer-Facing
- **Fulfillment Selection**: Choose between Pickup or Delivery at checkout
- **Zone-Based Pricing**: Automatic fee calculation based on delivery address ($5-$12)
- **Delivery Address Entry**: Full address capture with delivery instructions
- **Delivery Window Selection**: Choose 2-hour window or ASAP
- **Public Tracking**: View real-time driver location, ETA, and delivery status
- **Order Confirmation**: Tracking URL included in order confirmation email

### Driver-Facing
- **Mobile App**: PWA at `/driver/` with home screen installation
- **Authentication**: Firebase Auth (email + password)
- **Dashboard**: Today's deliveries with status overview
- **Delivery Details**: Order info, customer address, delivery instructions
- **Navigation**: Integration with Google Maps for turn-by-turn directions
- **GPS Tracking**: Automatic location updates every 30 seconds
- **Compliance Capture**:
  - ID Verification: 4 ID types, real-time age validation
  - Signature Pad: Canvas-based signature capture
  - Proof Photo: Camera capture for proof of delivery

### Dispensary-Facing
- **Dispatch Dashboard**: `/dashboard/delivery` with 4 tabs
  - **Active Deliveries**: Live map, order list, driver assignment
  - **Drivers**: Roster management, availability toggle, add/edit/delete
  - **Zones**: Geographic pricing configuration
  - **Analytics**: Performance metrics, driver leaderboard
- **Real-Time Tracking**: See all active drivers on map
- **Manual Assignment**: Assign drivers to pending orders
- **Performance Metrics**: Success rate, average delivery time, on-time %, driver rankings

## Database Schema

### Collections

#### `drivers` (Root)
```typescript
{
  id: string;                          // Firestore doc ID
  userId: string;                      // Links to users collection
  orgId: string;                       // Organization ID
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: Timestamp;            // Used to validate 21+ age
  vehicleType: 'car' | 'van' | 'bike' | 'scooter' | 'foot';
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePlate?: string;
  status: 'active' | 'inactive' | 'suspended';
  isAvailable: boolean;                // On/off duty toggle
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `deliveries` (Root)
```typescript
{
  id: string;                          // Firestore doc ID
  orderId: string;                     // Links to orders collection
  locationId: string;                  // Links to locations
  driverId?: string;                   // Assigned driver (null if pending)
  status: DeliveryStatus;              // pending | assigned | in_transit | arrived | delivered | failed

  // Address & Routing
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    lat?: number;                      // Geocoded latitude
    lng?: number;                      // Geocoded longitude
    deliveryInstructions?: string;
    phone?: string;                    // Customer phone for contact
    country?: string;                  // Default: 'US'
  };

  // Delivery Window
  deliveryWindow: {
    start: Timestamp;                  // Customer's preferred window start
    end: Timestamp;                    // Customer's preferred window end
  };

  // Pricing
  deliveryFee: number;                 // Calculated fee in dollars
  zoneId: string;                      // Links to delivery_zones subcollection

  // OCM Compliance — ID Verification
  idVerification: {
    verified: boolean;
    verifiedAt?: Timestamp;
    idType?: 'drivers_license' | 'state_id' | 'passport' | 'military_id';
    idNumber?: string;
    birthDate?: Timestamp;             // Calculated from ID for age verification
    photoUrl?: string;                 // Firebase Storage URL to ID photo
    rejectionReason?: string;          // If not verified (7 codes)
  };

  // Proof of Delivery
  signatureUrl?: string;               // Firebase Storage URL to signature image
  proofOfDeliveryPhoto?: string;       // Firebase Storage URL to proof photo

  // GPS Tracking
  estimatedArrival?: Timestamp;
  actualArrival?: Timestamp;
  driverLocation?: {
    lat: number;
    lng: number;
    updatedAt: Timestamp;
  };
  route?: google.maps.DirectionsResult;  // Route from Google Maps API
  distanceMiles?: number;

  // OCM Manifest
  manifestNumber?: string;             // OCM transaction number
  manifestTransmittedAt?: Timestamp;

  // Timestamps
  assignedAt?: Timestamp;
  departedAt?: Timestamp;
  arrivedAt?: Timestamp;
  deliveredAt?: Timestamp;
  failedAt?: Timestamp;
  failureReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `locations/{locationId}/delivery_zones` (Subcollection)
```typescript
{
  id: string;                          // Firestore doc ID
  locationId: string;                  // Links to parent location
  name: string;                        // e.g., "Downtown Syracuse"
  radiusMiles: number;                 // Delivery radius (5, 10, 15, etc.)
  baseFee: number;                     // Delivery fee in dollars
  minimumOrder: number;                // Minimum order amount to qualify
  isActive: boolean;
  polygon?: GeoJSON;                   // Future: custom boundaries
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `delivery_routes` (Root) — For Future Batch Optimization
```typescript
{
  id: string;
  driverId: string;
  locationId: string;
  deliveryIds: string[];               // Ordered list of delivery IDs
  status: 'planned' | 'active' | 'completed';
  sequence: number[];                  // Optimal order indices
  totalDistance: number;               // Miles
  estimatedDuration: number;           // Minutes
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
}
```

### Firestore Indexes

Add to `firestore.indexes.json`:

```json
[
  {
    "collectionGroup": "deliveries",
    "fields": [
      { "fieldPath": "locationId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  },
  {
    "collectionGroup": "deliveries",
    "fields": [
      { "fieldPath": "driverId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "deliveryWindow.start", "order": "ASCENDING" }
    ]
  },
  {
    "collectionGroup": "drivers",
    "fields": [
      { "fieldPath": "orgId", "order": "ASCENDING" },
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "isAvailable", "order": "ASCENDING" }
    ]
  }
]
```

## Type Definitions

### `src/types/delivery.ts`

Core TypeScript types (400+ lines):

```typescript
export interface Driver {
  id: string;
  userId: string;
  orgId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: Timestamp;
  vehicleType: VehicleType;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePlate?: string;
  status: DriverStatus;
  isAvailable: boolean;
  currentLocation?: GPSLocation;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Delivery {
  id: string;
  orderId: string;
  locationId: string;
  driverId?: string;
  status: DeliveryStatus;
  deliveryAddress: DeliveryAddress;
  deliveryWindow: { start: Timestamp; end: Timestamp };
  deliveryFee: number;
  zoneId: string;
  idVerification: IDVerification;
  signatureUrl?: string;
  proofOfDeliveryPhoto?: string;
  estimatedArrival?: Timestamp;
  actualArrival?: Timestamp;
  driverLocation?: GPSLocation;
  route?: google.maps.DirectionsResult;
  distanceMiles?: number;
  manifestNumber?: string;
  manifestTransmittedAt?: Timestamp;
  assignedAt?: Timestamp;
  departedAt?: Timestamp;
  arrivedAt?: Timestamp;
  deliveredAt?: Timestamp;
  failedAt?: Timestamp;
  failureReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DeliveryZone {
  id: string;
  locationId: string;
  name: string;
  radiusMiles: number;
  baseFee: number;
  minimumOrder: number;
  isActive: boolean;
  polygon?: GeoJSON;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  IN_TRANSIT = 'in_transit',
  ARRIVED = 'arrived',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export enum DriverStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum VehicleType {
  CAR = 'car',
  VAN = 'van',
  BIKE = 'bike',
  SCOOTER = 'scooter',
  FOOT = 'foot',
}

export interface IDVerification {
  verified: boolean;
  verifiedAt?: Timestamp;
  idType?: IDType;
  idNumber?: string;
  birthDate?: Timestamp;
  photoUrl?: string;
  rejectionReason?: RejectionReason;
}

export enum IDType {
  DRIVERS_LICENSE = 'drivers_license',
  STATE_ID = 'state_id',
  PASSPORT = 'passport',
  MILITARY_ID = 'military_id',
}

export enum RejectionReason {
  NO_ID = 'no_id',
  UNDER_AGE = 'under_age',
  EXPIRED = 'expired',
  INTOXICATED = 'intoxicated',
  ADDRESS_MISMATCH = 'address_mismatch',
  NOT_PRESENT = 'not_present',
  REFUSED = 'refused',
}
```

## Key Files

### Core Business Logic

#### `src/server/actions/delivery.ts` (850 lines)
**CRUD Operations:**
- `createDelivery(orderId, locationId, address, window)` — Initialize delivery
- `assignDriver(deliveryId, driverId)` — Assign driver with Firestore transaction
- `reassignDriver(deliveryId, newDriverId)` — Reassign driver
- `autoAssignDriver(deliveryId, locationId)` — Auto-assign first available driver
- `updateDeliveryStatus(deliveryId, status)` — Status transitions with validation
- `getDelivery(deliveryId)` — Fetch single delivery with auth check
- `getActiveDeliveries(locationId)` — Fetch current deliveries for dispatch

**Zone Management:**
- `createDeliveryZone(locationId, data)` — Add new zone
- `updateDeliveryZone(locationId, zoneId, data)` — Edit zone
- `deleteDeliveryZone(locationId, zoneId)` — Remove zone
- `getDeliveryZones(locationId)` — Fetch all zones

**Fee Calculation:**
- `calculateDeliveryFee(address, locationId)` — Geocode address, match zone, return fee + minimum
- `matchAddressToZone(lat, lng, zones)` — Haversine distance calculation

**Analytics:**
- `getDeliveryStats(locationId)` — Aggregate delivery metrics
- `getDriverPerformance(locationId)` — Per-driver KPIs

#### `src/server/actions/driver.ts` (350 lines)
- `createDriver(data)` — Onboard driver with license validation
- `updateDriver(id, data)` — Edit driver information
- `deleteDriver(id)` — Remove driver (checks for active deliveries)
- `toggleDriverAvailability(driverId)` — On/off duty toggle
- `getDriver(id)` — Fetch single driver
- `getDrivers(orgId)` — Fetch all drivers for organization

#### `src/server/actions/delivery-driver.ts` (380 lines)
**Driver-Specific Operations:**
- `getDriverDeliveries(driverId)` — Fetch driver's assigned deliveries
- `getDeliveryDetails(deliveryId, driverId)` — Get delivery (with driver access check)
- `updateDriverLocation(deliveryId, driverId, lat, lng)` — Record GPS update
- `startDelivery(deliveryId, driverId)` — Start delivery (transition to in_transit)
- `markArrived(deliveryId, driverId)` — Mark arrived (transition to arrived)
- `completeDelivery(deliveryId, driverId, idVerification, signature, photo)` — Complete delivery with compliance

### React Components

#### Checkout Integration
- `src/components/checkout/fulfillment-selection.tsx` (200 lines) — Pickup/Delivery card selection
- `src/components/checkout/delivery-address-form.tsx` (420 lines) — Address entry + zone validation + time slot

#### Dispensary Admin
- `src/app/dashboard/delivery/page.tsx` — Main dashboard wrapper
- `src/app/dashboard/delivery/components/delivery-dashboard.tsx` — Tab navigation
- `src/app/dashboard/delivery/components/active-deliveries-tab.tsx` (280 lines) — Live dispatch map + list
- `src/app/dashboard/delivery/components/drivers-tab.tsx` (220 lines) — Roster + add/edit/delete
- `src/app/dashboard/delivery/components/add-driver-dialog.tsx` (280 lines) — Driver form modal
- `src/app/dashboard/delivery/components/zones-tab.tsx` (150 lines) — Zone configuration
- `src/app/dashboard/delivery/components/analytics-tab.tsx` (340 lines) — Metrics + leaderboard

#### Driver Mobile App
- `src/app/driver/login/page.tsx` (210 lines) — Driver authentication
- `src/app/driver/dashboard/page.tsx` (280 lines) — Driver home
- `src/app/driver/delivery/[id]/page.tsx` (server wrapper) — Dynamic route wrapper
- `src/app/driver/delivery/[id]/client.tsx` (350 lines) — Delivery details + GPS tracking
- `src/app/driver/manifest.ts` (35 lines) — PWA manifest for home screen install

#### Customer Tracking
- `src/app/track/[deliveryId]/page.tsx` (server wrapper) — Public tracking wrapper
- `src/app/track/[deliveryId]/client.tsx` (280 lines) — Real-time tracking UI

#### Compliance Capture
- `src/components/delivery/id-verification-form.tsx` (420 lines) — Age verification
- `src/components/delivery/signature-pad.tsx` (290 lines) — Canvas signature
- `src/components/delivery/proof-photo-capture.tsx` (280 lines) — Photo capture

### API Routes

#### Fee Calculation
- `POST /api/delivery/calculate-fee` (150 lines) — Real-time fee calculation

#### Delivery Management
- `POST /api/delivery/create` (200 lines) — Create delivery after order confirmation
- `PUT /api/delivery/[id]/assign-driver` (180 lines) — Assign driver
- `POST /api/delivery/[id]/update-location` (150 lines) — GPS update (30-second intervals)
- `POST /api/delivery/[id]/verify-id` (180 lines) — ID verification upload
- `POST /api/delivery/[id]/complete` (220 lines) — Completion with signature + photo
- `GET /api/delivery/[id]/status` (80 lines) — Status for customer tracking

### Integration Points

#### Order Creation
- `src/app/checkout/actions/createOrder.ts` — Modified to:
  1. Create delivery record when `fulfillmentType === 'delivery'`
  2. Call `autoAssignDriver()` async (non-blocking)
  3. Return `trackingUrl` in success response

#### Order Types
- `src/types/orders.ts` — Extended OrderDoc with:
  - `fulfillmentType?: 'pickup' | 'delivery'`
  - `deliveryId?: string`
  - `deliveryFee?: number`
  - `deliveryWindow?: { start, end }`
  - `deliveryInstructions?: string`

#### Location Configuration
- `src/types/location.ts` — Added `deliveryConfig`:
  ```typescript
  deliveryConfig?: {
    enabled: boolean;
    maxDeliveriesPerRoute: number;
    estimatedPrepTime: number;  // minutes
    operatingHours: { [day: string]: { start, end } };
  };
  ```

## Implementation Workflow

### Phase 1: Setup (Immediate)
```bash
# 1. Deploy Firestore indexes
firebase deploy --only firestore:indexes

# 2. Create delivery types
# Already in: src/types/delivery.ts

# 3. Seed zones for Thrive Syracuse
npx tsx scripts/seed-delivery-zones.ts
```

### Phase 2: Checkout Integration
1. Customer selects **Pickup** or **Delivery** at checkout
2. If **Delivery**:
   - Enter delivery address
   - System geocodes address
   - Zone matching calculates fee
   - Select delivery time window (2-hour slot or ASAP)
   - Fee added to order total
3. Order confirmation includes **trackingUrl**

### Phase 3: Order Processing
1. Order created via `createOrder()`
2. If `fulfillmentType === 'delivery'`:
   - `createDelivery()` creates Firestore doc
   - `autoAssignDriver()` finds first available driver
   - Driver gets notification of assignment
   - Admin sees delivery on dispatch map

### Phase 4: Driver Workflow
1. Driver logs in at `/driver/login`
2. Views assigned deliveries at `/driver/dashboard`
3. Clicks delivery → `/driver/delivery/[id]`
4. **Start Delivery**: Transitions to `in_transit`, begins GPS updates (30-sec)
5. **Navigate**: Integration with Google Maps
6. **Arrive**: Marks `arrived`, ready for customer
7. **Verify Age**: Capture ID photo, verify 21+
8. **Signature**: Customer signs on device (Canvas)
9. **Proof Photo**: Take photo of delivered order
10. **Complete**: Delivery marked `delivered`, order marked `completed`

### Phase 5: Customer Tracking
- Customer receives **trackingUrl** in confirmation email
- Opens `/track/[deliveryId]`
- Sees real-time driver location on map
- 5-step timeline: Pending → Assigned → In Transit → Arrived → Delivered
- ETA updates as driver moves

### Phase 6: Analytics
- Dispensary admin views `/dashboard/delivery?tab=analytics`
- Monitors: Success rate, avg time, on-time %, driver performance
- Identifies top-performing drivers
- Tracks zone profitability

## Security & Compliance

### NY OCM Compliance
- ✅ **21+ Age Verification**: 4 ID types, real-time age calculation
- ✅ **Business Hours**: Validated during checkout
- ✅ **Driver Requirements**: 21+ age, valid license stored
- ✅ **GPS Tracking**: 30-second real-time updates
- ✅ **Manifest Generation**: OCM transaction numbers auto-generated
- ✅ **Proof of Delivery**: Photo + signature captured + stored
- ✅ **Child-Resistant Packaging**: POS integration (future)

### Data Protection
- **Firebase Storage Encryption**: ID photos, signatures, proofs encrypted at rest
- **Role-Based Access**: Only assigned driver can access delivery details
- **Firestore Rules**: Orders only visible to customers/assigned drivers
- **Audit Logging**: All status changes + compliance events logged
- **HTTPS Only**: All API routes require HTTPS

### Race Conditions
- **Driver Assignment**: Uses Firestore transaction to prevent concurrent assigns
- **Status Updates**: Atomic field updates prevent stale reads
- **Location Updates**: High-frequency writes optimized for real-time performance

## Cost Breakdown (100 deliveries/day)

| Service | Cost | Notes |
|---------|------|-------|
| Google Maps API | $135/month | Geocoding + directions + maps widget |
| Firestore | $6/month | ~50K reads/writes per day |
| Firebase Storage | $0.08/month | ID photos, signatures, proofs |
| SMS Notifications | $72/month | 3 SMS per delivery @ $0.008 each |
| **Total** | **$213/month** | **$2.13 per delivery** |

## Next Steps (Post-MVP)

### Near-Term (Phase 7+)
1. **Batch Route Optimization**: AI-powered route sequencing for multi-stop deliveries
2. **Delivery Scheduling**: Admin calendar view with manual shift planning
3. **Driver Analytics**: Earnings, performance trends, incentive programs
4. **Customer Notifications**: SMS/Email updates (en route, arrived, delivered)
5. **Proof of Delivery**: Automatic OCM manifest upload

### Medium-Term
1. **Real-Time Distance Pricing**: Replace zones with actual delivery distance
2. **Scheduled Deliveries**: Calendar booking for future dates
3. **Delivery Insurance**: Carrier integration for damaged goods claims
4. **Performance Incentives**: Bonuses for on-time/high-rated drivers
5. **Weather Integration**: Delays/closures based on conditions

### Long-Term
1. **Third-Party Driver Pools**: Integrate Doordash/Uber Eats driver networks
2. **Autonomous Deliveries**: Drone/robot delivery for future compliance
3. **Blockchain Compliance**: Immutable OCM manifest records
4. **International Expansion**: CPTPP cannabis logistics

## Testing Checklist

### Phase 1: MVP (Week 1)
- [ ] Fulfillment selection working
- [ ] Delivery address form validation
- [ ] Zone matching + fee calculation
- [ ] Delivery record created on order
- [ ] Types check passing

### Phase 2: Driver Management (Week 2)
- [ ] Driver add/edit/delete working
- [ ] Availability toggle persists
- [ ] Manual assignment works
- [ ] Zone editor updates fees
- [ ] Admin dashboard loads

### Phase 3: GPS & Tracking (Week 3)
- [ ] Driver login/logout works
- [ ] Dashboard shows assigned deliveries
- [ ] GPS updates every 30 seconds
- [ ] Customer tracking page loads
- [ ] Admin dispatch map shows drivers

### Phase 4: Compliance (Week 4)
- [ ] ID form validates age correctly
- [ ] Rejects under-21 with reason
- [ ] Signature capture works (touch + mouse)
- [ ] Photo capture works (camera + file upload)
- [ ] Manifest generates with OCM format

### Phase 5: Analytics (Week 5)
- [ ] All KPIs calculate correctly
- [ ] Leaderboard ranks drivers by completed deliveries
- [ ] Period filters work (Today/Week/Month)
- [ ] Color coding shows performance tiers

### Phase 6: Production (Week 6)
- [ ] Auto-assignment works without user assignment
- [ ] Reassign dropdown appears for in-transit
- [ ] PWA manifest installs to home screen
- [ ] All build checks passing
- [ ] Performance metrics acceptable (<500ms load time)

## Troubleshooting

### Issue: "Delivery not assigned" after order creation
**Root Cause**: `autoAssignDriver()` failed due to no available drivers
**Fix**: Check driver availability (`isAvailable: true`) + ensure drivers exist for location

### Issue: GPS updates not appearing on customer map
**Root Cause**: Firestore real-time listener not subscribed
**Fix**: Check browser console for Firestore errors; verify delivery doc exists

### Issue: ID verification always fails
**Root Cause**: Age calculation comparing dates incorrectly
**Fix**: Ensure birthDate is Timestamp type; check timezone handling

### Issue: Zone calculation returns wrong fee
**Root Cause**: Address geocoding failed; distance calculation off
**Fix**: Test geocoding separately; verify Haversine formula with known coordinates

## Related Systems

- **Checkout Flow**: `src/components/checkout/` — Integrates fulfillment selection
- **Orders**: `src/types/orders.ts` — Extended with delivery fields
- **Locations**: `src/types/location.ts` — Added deliveryConfig
- **Notifications**: `src/server/services/communications/` — SMS/Email for delivery updates
- **Maps**: `@react-google-maps/api` — Navigation + tracking UI
- **Storage**: Firebase Storage — ID photos, signatures, proofs
- **Firestore Rules**: `firestore.rules` — Access control for delivery docs

## References

- **Prime Context**: `.agent/prime.md` — Detailed system architecture
- **Memory**: `memory/MEMORY.md` — Session notes + context
- **NY OCM**: https://cannabis.ny.gov/regulations — Official compliance guide
- **Google Maps API**: https://developers.google.com/maps — Geocoding + directions
- **Firebase Storage**: https://firebase.google.com/docs/storage — File upload/download
