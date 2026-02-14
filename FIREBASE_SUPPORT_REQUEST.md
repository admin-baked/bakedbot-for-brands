# Firebase Support Request - Memory Limit Increase

**Date:** February 14, 2026
**Project:** studio-567050101-bc6e8
**Backend:** bakedbot-prod
**Request:** Increase build memory limit from 30GB to 40-48GB

---

## Issue Summary

Our Next.js 16.1.2 application (201 pages) is consistently failing with OOM (exit code 137) during the build phase, even after implementing Firebase Support's recommendation to reduce from 64GB to 30GB.

## Build Attempts

| Attempt | Memory Limit | Result | Duration | Exit Code |
|---------|--------------|--------|----------|-----------|
| 1 | 64GB | OOM Failed | 33 min | 137 |
| 2 | 30GB | OOM Failed | 6 min 20 sec | 137 |

## Previous Firebase Support Recommendation

On February 13, 2026, Firebase Support (email thread) recommended:
> "We have confirmed that the container memory for builds is approximately 64GB of memory. However, this is physical RAM available to containers, so allocating 64GB will not leave headroom for things like the build environment itself and so on. We'd recommend at most 30000 (30GB)."

We applied this recommendation but the build still fails with OOM.

## Our Analysis

1. **Physical RAM Constraint**: The 30GB limit leaves only ~2GB headroom in the ~32GB container
2. **Next.js 16 + Turbopack**: Heavy memory usage during optimization phase
3. **Application Size**: 201 pages with extensive dependencies (AI SDKs, Firebase, etc.)
4. **Build Phase Failure**: Consistently fails at "Creating an optimized production build"

## Request

We request an **exception to increase our build memory limit to 40-48GB** for this specific backend.

**Justification:**
- Commercial production application serving live customers
- Budget-constrained startup (cannot afford infrastructure migration)
- AI-only engineering team (limited DevOps resources)
- Current OOM is blocking all deployments

## Alternative Approaches Attempted

1. **Page Reduction**: Removed 3 pages (204 → 201) - No improvement
2. **Build Optimizations**: Applied 6 optimizations from Firebase docs - No improvement
3. **App Splitting**: Attempted to extract features to separate backends - Too complex (153+ dependency errors)

## Technical Details

**Current apphosting.yaml:**
```yaml
env:
  - variable: NODE_OPTIONS
    value: "--max-old-space-size=30000"
    availability: [ BUILD ]
```

**Build logs** (most recent failure):
- Commit: 42b7121305b2a4d457e3a5e510ff20150fdfdb66
- Timestamp: Feb 14, 2026, 7:14 AM UTC
- Error: "Killed" after "Creating an optimized production build"
- Exit code: 137 (SIGKILL - OOM)

## Proposed Solution

Increase build memory allocation to one of:
- **Option A**: 40GB (NODE_OPTIONS: 40000) - Conservative increase
- **Option B**: 48GB (NODE_OPTIONS: 48000) - Safer headroom

We understand this exceeds the recommended ~32GB physical RAM limit. We're requesting:
1. **Temporary exception** while we architect a long-term solution
2. **OR guidance** on alternative infrastructure options within Firebase ecosystem

## Contact

- **Primary**: martez@bakedbot.ai (Owner, Billing Admin)
- **Project ID**: studio-567050101-bc6e8
- **Backend**: bakedbot-prod
- **URL**: https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app

---

**Urgency:** High - Production deployments blocked
**Willing to schedule call:** Yes
**Timezone:** US Eastern (UTC-5)
