# BakedBot AI Data Architecture

> Product data + nationwide directory + claim-to-tenant pipeline (Firebase)

## Why This Exists

We need one architecture that supports:

1. **Nationwide rollout**: generate public brand + dispensary pages (SEO + discovery) even before anyone signs up
2. **Customer truth**: when a brand/dispensary claims, they import product/menu data and that becomes the system of record for recommendations, compliant marketing, analytics, etc.
3. **Auditability + replay**: keep raw source payloads and a deterministic merge path so we can replay imports, debug issues, and prove what happened

---

## Core Principle: Treat Imports as Evidence, Not Truth

We keep **Raw → Canonical → Derived** layers in both the Directory world and the Tenant world.

---

## 1) Two Parallel Worlds in Firebase

### World A: Public Directory (nationwide "best-effort truth")

This is our SEO machine. Data is aggregated from public sources and can be imperfect.

- **Stores**: brands, dispensaries, locations, and programmatic pages (ZIP/city/state/category)
- Has confidence scores and dedupe resolution
- **Primary CTA loop**: "Claim this page to fix / verify."

### World B: Tenant-Owned Workspace ("customer truth")

This is the signed-in, permissioned world. Once claimed, tenant data becomes authoritative for:

- menu/catalog, inventory/pricing, promos
- Smokey recommendations + Craig campaigns
- compliance checks and audit trails
- BI/forecasting

### The Bridge: Claim Links Directory Entity → Tenant

Claim is a durable mapping + permission switch.

---

## 2) Storage Strategy: Firestore vs Cloud Storage

| Firestore (control plane + normalized entities + fast page views) | Cloud Storage (payload warehouse) |
|-------------------------------------------------------------------|-----------------------------------|
| entity metadata (brand/dispensary/product) | raw import payloads (often >1MB) |
| canonical records (cleaned fields) | large blobs (COAs, PDFs) |
| mapping tables | images/screenshots |
| derived "views" optimized for reads | optional "normalized payload" snapshots |

---

## 3) Layering Model: Raw → Canonical → Derived

| Layer | Purpose | Storage |
|-------|---------|---------|
| **Raw** (immutable, append-only) | audit trail, replay, idempotency support | Blobs in Storage + metadata in Firestore |
| **Canonical** (normalized SoR) | stable IDs, consistent fields, queryable | Firestore documents + subcollections |
| **Derived** (materialized views) | SEO pages, fast search, recommendation features | Flattened docs with denormalized fields |

---

## 4) Data Model (Collections)

### 4.1 Directory (nationwide public graph)

**Top-level (not tenant-scoped):**

```
directory/brands/{brandId}
directory/dispensaries/{dispensaryId}
directory/locations/{locationId}
directory/pages/{pageId}
directory/entityViews/{entityId}
directory/pageViews/{pageId}
```

**Raw ingestion + refresh:**

```
directory/sources/{sourceId}
directory/imports/{importId}
Storage: gs://.../directory/imports/{importId}/raw.json.gz
```

**Identity + claim:**

```
directory/claims/{claimId}
directory/tenantLinks/{directoryEntityKey} → { tenantId, verifiedAt, status }
```

**Suggested directory entity shape:**
- name, address, geo, phone, website
- license fields where available
- confidence (0–1), resolution metadata
- sourceRefs (array of pointers to raw import evidence)
- lastSeenAt, lastUpdatedAt

### 4.2 Tenants (customer workspace)

All tenant-owned data is scoped:

```
tenants/{tenantId}
  /profile
  /directoryRef
  /sources/{sourceId}
  /imports/{importId}
  /mappings/...
  /catalog/...
  /publicViews/...
  /events/...
  /audit/...
```

---

## 5) The "Product Mapping Problem"

Every POS/menu system has different IDs. We must prevent duplicates.

**Mapping table (tenant-owned):**

```
tenants/{tenantId}/mappings/products/{mappingId}
  source: "dutchie" | "jane" | "biotrack" | "csv" | ...
  externalId: string
  productId: canonical UUID
  confidence: 0–1
  method: exact | upc | fuzzy | manual
  updatedAt
```

**In canonical product doc, keep a small reverse index:**

```typescript
externalRefs: { "dutchie:abc123": true, "jane:xyz": true }
```

> **Rule**: Imports never directly create "truth." They land in staging and then merge into canonical via mapping resolution.

---

## 6) Tenant Catalog Model (Canonical)

**Canonical products:**

```
tenants/{tenantId}/catalog/products/{productId}
  stable UUID
  name, brandName, category
  strainType (if applicable), terpenes (normalized)
  potency: structured fields by unit
  images: pointers (Storage URLs or CDN)
  compliance: flags + Deebo outputs (jurisdiction-aware)
  externalRefs: reverse index
  updatedAt
```

**Separate hot / high-churn data (subcollections):**

```
.../variants/{variantId}
.../inventory/{locationId}
.../prices/{locationId}
.../labResults/{labId}
.../promos/{promoId}
```

**Public-safe tenant snapshot:**

```
tenants/{tenantId}/publicViews/products/{productId}
  sanitized, flattened, stable
  contains only fields safe for public display
  intentionally denormalized for 1-doc reads
```

---

## 7) Import Pipeline (Idempotent + Replayable)

**Firestore metadata:**

```
tenants/{tenantId}/imports/{importId}
  source, status, hash
  startedAt, endedAt
  stats: counts, warnings, errors
  storagePathRaw, storagePathNormalized
```

**Storage payloads:**

```
gs://.../tenants/{tenantId}/imports/{importId}/raw.json.gz
gs://.../tenants/{tenantId}/imports/{importId}/normalized.json.gz (optional)
```

**Staging area:**

```
tenants/{tenantId}/staging/products/{externalId}
  normalized fields + parse diagnostics
```

**Merge job:**
1. Resolve mapping (existing mappings/products)
2. If no match, create new canonical product doc + mapping
3. Update externalRefs reverse index
4. Write changed productIds to a "dirty list" for derived view rebuild

**Idempotency rules:**
- Every import gets a hash (content hash or per-record hash)
- Staging doc IDs are deterministic (source + externalId)
- Merge uses upserts with deterministic keys
- Retry-safe: same payload does not create duplicates

---

## 8) Derived Views (SEO + Speed + UX)

**Directory derived views:**

```
directory/entityViews/{brandId|dispensaryId}
directory/pageViews/{pageId}
```

**Tenant derived views:**

```
tenants/{tenantId}/publicViews/...
tenants/{tenantId}/searchViews/...
tenants/{tenantId}/recoFeatures/{productId}
```

> **Rule**: Public-facing UI never reconstructs deep joins at request time. It reads view docs.

---

## 9) Claim Flow: Directory Listing → Tenant Workspace

**Claim objects:**

```
directory/claims/{claimId}
  entityType, entityId
  claimantEmail, verification method
  status: requested | verified | rejected
  tenantId (once created)
  audit timestamps
```

**On verification success (transactional sequence):**

1. Create tenant: `tenants/{tenantId}` with `directoryRef`
2. Create link: `directory/tenantLinks/{entityKey} → { tenantId, verifiedAt }`
3. Mark directory entity "verified/claimed"
4. Kick off onboarding (connect sources, start imports, generate views)
5. Update directory derived views to prefer tenant-owned fields

**Field precedence (important):**
- Directory page shows tenant-verified fields (hours, website, description, etc.)
- Directory still retains last public snapshot for SEO stability + fallback
- Inventory/pricing remains tenant-owned (never "public guessed")

---

## 10) Security & Permissions (Firestore Rules)

**Multi-tenant isolation:**

```javascript
allow read/write: if request.auth.token.tenantId == tenantId
```

**Public directory access:**

```javascript
allow read on directory/entityViews/* and directory/pageViews/*
deny writes except server (Admin SDK)
```

**Claims:**
- Claim submission write allowed (rate-limited + validated)
- Claim verification and tenant linking server-only

---

## 11) Scaling + Cost Control

| Concern | Solution |
|---------|----------|
| Write amplification | Split high-churn docs (inventory/prices/events) from stable product docs |
| Document size | Keep < 1MB, use Storage for large blobs |
| Index discipline | Define composite indexes only where queries require |
| Hotspot avoidance | Use auto IDs or hashed IDs, shard counters if needed |

---

## 12) Observability & Audit Trail

**Events (append-only):**

```
tenants/{tenantId}/events/{eventId}
  reco shown, click, add-to-cart, conversions
  include sessionId, productIds, context
```

**Audit actions:**

```
tenants/{tenantId}/audit/actions/{actionId}
  Deebo check results
  Craig send logs
  Smokey recommendation decision summaries
  inputs/outputs pointers (never giant payloads inline)
```

---

## 13) Build Order (Implementation Plan)

### Phase 1 — Foundation (1–2 weeks)
- Directory core entities + entityViews/pageViews
- Tenant core + claim linking
- Basic import metadata + raw storage

### Phase 2 — Imports (2–4 weeks)
- Parser to staging
- Mapping + merge job
- Tenant canonical catalog structure
- Tenant publicViews builder

### Phase 3 — Nationwide Rollout Loop (ongoing)
- Scheduled directory ingestion refresh
- Dedupe + entity resolution improvements
- Programmatic page generation at scale
- Claim funnel instrumentation + Craig outreach triggers

---

## 14) Concrete Schema Reference

### Directory

```
directory/brands/{brandId}
directory/dispensaries/{dispensaryId}
directory/locations/{locationId}
directory/pages/{pageId}
directory/entityViews/{entityId}
directory/pageViews/{pageId}
directory/imports/{importId}
directory/sources/{sourceId}
directory/claims/{claimId}
directory/tenantLinks/{entityKey}
```

### Tenant

```
tenants/{tenantId}
tenants/{tenantId}/sources/{sourceId}
tenants/{tenantId}/imports/{importId}
tenants/{tenantId}/staging/products/{externalId}
tenants/{tenantId}/mappings/products/{mappingId}
tenants/{tenantId}/catalog/products/{productId}
  /variants/{variantId}
  /inventory/{locationId}
  /prices/{locationId}
  /labResults/{labId}
  /promos/{promoId}
tenants/{tenantId}/publicViews/products/{productId}
tenants/{tenantId}/events/{eventId}
tenants/{tenantId}/audit/actions/{actionId}
```

---

## 15) Design Rules (TL;DR for Engineers)

1. **Directory != Tenant.** Directory is best-effort public truth; tenant is customer truth.
2. **Raw is forever.** Store raw payloads in Storage, metadata in Firestore.
3. **Canonical uses stable IDs.** External IDs are mapped, not trusted.
4. **Separate hot writes.** Inventory/prices/events should not rewrite product docs.
5. **Views are required.** Public and UX reads should be 1–2 doc fetches, not joins.
6. **Claim creates a link + control switch.** Verified fields come from tenant; directory keeps fallback snapshots.
7. **Everything is replayable.** Idempotent imports, deterministic staging IDs, merge job with audit logs.
