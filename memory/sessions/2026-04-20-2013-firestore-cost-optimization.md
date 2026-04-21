# Session: Firestore Query Cost Optimization
**Date:** 2026-04-20
**Builder:** GEM
**Version:** 4.10.19-GEM

## Objective
Reduce Firestore query costs by resolving N+1 patterns and enforcing safety `.limit()` bounds.

## Actions Taken
1. **Tooling Refinement**: Rewrote `scripts/audit-query-cost.mjs` line-by-line analyzer to exclude Firestore batches and better recognize valid `Promise.all` concurrency, significantly reducing false positives in N+1 reporting.
2. **Limit Enforcements**: Fixed multiple `HIGH` risk unbounded reads across core services:
   - `src/app/actions/bundles.ts`: Applied `.limit(500)` and fallback `.limit(100)` to active bundle fetches.
   - `src/app/actions/carousels.ts`: Applied `.limit(100)` bounding for UI fetching.
   - `src/app/actions/dynamic-pricing.ts`: Guarded massive array batch mutations (`publishPricesToMenu`, `revertAllPricesOnMenu`) with `500`/`1000` chunk limitations to prevent crashing Cloud Run containers or bypassing the Firestore batch limit of 500 documents.
3. **QA**: Passed full typecheck suite and generated standard Simplify `/record` approval for the outgoing diff.

## Next Steps
- Implement telemetry-driven (rather than static) addition of composite indexes as they appear in logs.
- Explore further optimizations in CRM deduplication strategies if traffic volumes necessitate it.
