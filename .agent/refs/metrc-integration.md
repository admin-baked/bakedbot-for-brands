# Metrc Software Integrator — API Integration Plan

> Reference doc for Metrc traceability API integration. Path 3 of the cannabis lab data moat strategy.

## Overview

Metrc is the state-mandated seed-to-sale tracking system used by cannabis regulators in 20+ US states. Their API provides real-time access to package-level traceability data including lab results, transfers, and compliance status. Access requires applying as a **Software Integrator** through Metrc's vendor program.

## Why Metrc API Matters

| Data Source | Coverage | Freshness | Cost |
|-------------|----------|-----------|------|
| Alleaves POS (Path 1) | Terpenes, strain, Metrc tag from batch details | Real-time on sync | $0 (already built) |
| COA QR Scraping (Path 2) | Full lab panel from verify pages | On-demand, cached | ~$2-5/mo (LLM fallback) |
| **Metrc API (Path 3)** | **Authoritative lab results, transfer chain, compliance** | **Real-time** | **~$500-800 one-time + per-state fees** |

Metrc API is the gold standard — it's the authoritative source that labs upload to. COA pages are derived from this data.

## Application Process

### Step 1: Software Integrator Agreement

- **URL**: Contact Metrc sales via their partner portal or email `integrations@metrc.com`
- **Requirements**:
  - Business entity (LLC/Corp) — BakedBot AI LLC qualifies
  - Software platform description (cannabis commerce OS)
  - Use case description (product traceability, lab result display, compliance verification)
  - Proof of cannabis industry clients (Thrive Syracuse, pilot customers)
- **Cost**: ~$500-800 one-time integration fee (varies by state)
- **Timeline**: 2-4 weeks for approval + sandbox access

### Step 2: Sandbox Testing

- Each state has its own API subdomain: `sandbox-api-ny.metrc.com`, `sandbox-api-ca.metrc.com`, etc.
- Metrc provides test credentials (API key + user key) for sandbox
- Must demonstrate successful API calls before production access

### Step 3: Production Access

- Per-state production keys issued after sandbox validation
- Each licensee must authorize BakedBot as a software integrator in their Metrc account
- This is a one-click authorization in the licensee's Metrc dashboard

## API Architecture

### Authentication
```
GET https://api-ny.metrc.com/packages/v2/{id}
Headers:
  Authorization: Basic base64(apiKey:userKey)
```

- `apiKey` = Software Integrator key (BakedBot's key, one per state)
- `userKey` = Licensee's API key (each dispensary generates this in Metrc)
- Both keys required for every request

### Key Endpoints

| Endpoint | Data | Use Case |
|----------|------|----------|
| `GET /packages/v2/{id}` | Package details, lab results, Metrc tag | Product enrichment |
| `GET /packages/v2/active` | All active packages for a licensee | Bulk sync |
| `GET /labtests/v2/results` | Lab test results by package ID | COA data |
| `GET /labtests/v2/types` | Available test types | Schema reference |
| `GET /transfers/v2/incoming` | Incoming transfers | Supply chain tracking |
| `GET /harvests/v2/active` | Active harvests | Strain/batch traceability |
| `GET /strains/v2/active` | Strain registry | Genetics database |

### Lab Test Result Shape
```typescript
interface MetrcLabTestResult {
  Id: number;
  PackageId: number;
  LabTestResultId: number;
  LabFacilityLicenseNumber: string;
  LabFacilityName: string;
  OverallPassed: boolean;
  TestPerformedDate: string;       // ISO date
  ResultReleaseDate: string;
  TestTypeName: string;            // "THC", "Terpenes", "Pesticides", etc.
  TestResultLevel: number;         // Numeric value
  TestResultLevelUnit: string;     // "Percent", "mg/g", "PPM"
  TestComment?: string;
}
```

### Rate Limits
- 50 requests/second per API key (generous)
- No daily limit documented
- Pagination via `pageNumber` + `pageSize` (max 500)

## Integration Plan

### Phase 1: Apply + Sandbox (Week 1-3)
1. Email `integrations@metrc.com` with BakedBot platform description
2. Complete Software Integrator agreement
3. Pay integration fee
4. Receive sandbox credentials for NY (launch market)

### Phase 2: Build Adapter (Week 3-4)
```
src/server/services/metrc/
  client.ts         — HTTP client, auth, rate limiting, retry
  types.ts          — TypeScript interfaces for Metrc API responses  
  sync.ts           — Batch sync: packages → lab results → Firestore
  mapper.ts         — MetrcLabTestResult → ProductLabResult mapping
```

### Phase 3: Wire Into Pipeline (Week 4-5)
- POS sync checks for Metrc tag → calls Metrc API for authoritative lab data
- Falls back to COA QR scraping (Path 2) if no Metrc API access for that state
- Caches results in Firestore `labResults` subcollection (same schema as Path 2)

### Phase 4: Per-State Rollout
- NY first (Thrive Syracuse)
- Then expand to states as customer base grows
- Each new state = new API key + licensee authorization

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| Software Integrator fee | $500-800 | One-time |
| Per-state API fee (if any) | $0-200/state | Annual |
| Infrastructure (API calls) | ~$0 | Included in existing GCP |
| **Total Year 1 (NY only)** | **~$500-1,000** | |
| **Total Year 1 (3 states)** | **~$800-1,400** | |

## Priority vs Other Paths

```
Path 1 (Alleaves POS) ✅ DONE — Zero cost, real-time, covers terpenes/strain/Metrc tags
Path 2 (COA Scraping) ✅ DONE — $2-5/mo, on-demand, covers full lab panels
Path 3 (Metrc API)    ⏳ PENDING — $500-1K, authoritative, covers everything + compliance chain
```

**Recommendation**: Apply now (2-4 week lead time). Paths 1+2 cover the launch. Path 3 becomes the production-grade source once approved.

## Licensee Onboarding Flow

When a new dispensary customer onboards:
1. BakedBot asks for their Metrc API user key during setup
2. Dispensary generates key in Metrc dashboard → Settings → API Keys
3. Key stored encrypted in `tenants/{orgId}/secrets/metrc`
4. POS sync automatically uses Metrc API for lab data enrichment

## State Coverage

Metrc operates in: AK, CA, CO, DC, LA, MA, MD, ME, MI, MO, MT, NV, OH, OK, OR, WV, and **NY** (our launch market).

New states coming online regularly. Check `metrc.com/partners` for current list.

---

*Created 2026-04-11. Update after Metrc application submission.*
