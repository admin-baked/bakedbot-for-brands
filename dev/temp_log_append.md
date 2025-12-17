
## 2025-12-16T19:25Z – feat_coverage_assurance – antigravity
- **Completed Coverage Packs & Tiers**:
  - **Pricing Model**: Implemented "Claim Pro" ($99/mo) with 25 ZIP limit and add-on packs (+100 ZIPs/$49, +500 ZIPs/$149).
  - **Enforcement**: strict backend checks in `PageGeneratorService.checkCoverageLimit(orgId)` blocking generation if over limit.
  - **Billing**: Updated `createClaimSubscription` and `authorize-net` route to handle coverage pack add-ons and compute accurate recurring totals.
  - **Dashboard**: Added visual usage tracking (Progress Bar) to CEO Dashboard Operations tab.
- **Fixed Critical Bugs**:
  - **Missing Batch Pages**: Fixed `brandId` attribution in `PageGeneratorService` (was null).
  - **Persistence**: Switched `PageGeneratorService` to `firebase-admin` SDK to bypass client-side rules for reliable batch jobs.
  - **Google Maps**: Centralized `GOOGLE_MAPS_API_KEY` in `config.ts` and fixed `RetailerMap` component.
- **Status**: Deployed and Verified.
