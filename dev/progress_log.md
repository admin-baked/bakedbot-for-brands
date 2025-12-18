
# Progress Log

## Phase G: Model B Claim-Based Access (Current)

**Status**: In Progress  
**Start Date**: 2025-12-18

### Objectives
- Implement invite-only claim model for ZIP/City pages
- Top 25 ZIPs initial rollout
- Authorize.net billing integration
- Smokey Pay (CanPay) for dispensary transactions

### Completed Steps
- [x] **Core Claim System**:
    - Created `claim-exclusivity.ts` (one-owner-per-ZIP rule, invite codes)
    - Created `page-claims.ts` server actions (claim workflow)
    - Updated `coverage-packs.ts` with Model B pricing tiers
- [x] **Pricing Tiers**: Starter $99/25 ZIPs, Growth $249/100 ZIPs, Scale $699/300 ZIPs
- [x] **Page Templates**:
    - Zip pages: Lightweight SEO intro + top-rated snippet + Smokey
    - City pages: Full editorial with editorialIntro + interactive map
- [x] **Unit Tests**: claim-exclusivity.test.ts, page-claims.test.ts
- [x] **Build Fixes**: Fixed `db` -> `firestore: db` in zip API route
- [x] **Rollout Config**: Created `dev/rollout_config.md`

### Current Tasks
- [ ] **Authorize.net Integration**: Create billing adapter
- [ ] **Smokey Pay Integration**: Connect CanPay for menu payments
- [ ] **Top 25 ZIP Selection**: Finalize Chicago core ZIPs
- [ ] **Claim UI**: Build claim flow pages

### Billing Configuration
- **Subscriptions**: Authorize.net (recurring billing)
- **Menu Payments**: Smokey Pay (CanPay)

---

## Phase F: 1,000 SEO-Optimized Page Rollout (Completed)

**Status**: Complete  
**Dates**: 2025-12-18

### Completed Steps
- [x] Generated 200 dispensary pages for Illinois
- [x] Generated 1,383 ZIP pages for Illinois
- [x] Created `/zip/[slug]` route and API endpoint
- [x] Added Deebo SEO Review fields to all page types
- [x] Updated CEO dashboard with Deebo Review section
- [x] Fixed brand login redirect (session cookie check in withAuth)

---

## Previous Phases

### Phase E: Marketplace Core (Completed)
- Delivered Brand Dashboard, Dispensary Locator, and Claim Flows
- Resolved build and deployment issues
