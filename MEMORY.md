# BakedBot Session Memory

## Session: 2026-04-01
- **Thrive welcome-playbook recovery** (`203b3b19c`) — Hardened the playbook event dispatcher to fall back to active root `playbooks` docs when `playbook_event_listeners` are missing, and backfill those listeners so customer signup/check-in events still reach the welcome workflow.
- **Canonical welcome email execution** (`203b3b19c`) — Routed `welcome_personalized` through the shared Mrs. Parker welcome-email service and auto-scheduled the Thrive welcome playbook during pilot setup so live check-ins can send the right email path.
- **Smokey natural-language menu search** (`203b3b19c`) — Added shared menu parsing/ranking for category, effect, strain, and price prompts, plus direct age-answer handling and a deterministic anonymous-consumer fallback when tool execution returns no products.
- **Smokey cleanup after /simplify** (`fe86f502c`) — Extracted the shared product ID helper and preserved ranked fallback ordering so consumer chat result handling stays easier to reason about.
- **Verification** (`203b3b19c`, `fe86f502c`) — Targeted Jest coverage for Smokey menu search, consumer adapter fallback, playbook dispatcher fallback, and welcome-email execution passed, and `.\scripts\npm-safe.cmd run check:types` passed after the session.

### Gotchas (2026-04-01)
- Active playbooks can still be inert if the org is missing `playbook_event_listeners`; check listener materialization before assuming the trigger logic is broken.
- Consumer menu chat needs both a semantic menu-search fallback and a direct compliance path for age questions, or natural-language prompts collapse into generic "no products found" replies even when menu data is loaded.

## Session: 2026-03-25
- **Default-shell Node/Jest startup fixed**: Added repo-safe `scripts/node-safe.cmd` and `scripts/npm-safe.cmd` wrappers plus a shared bootstrap so sandboxed Node file execution stays inside `.codex-jest-home` and no longer fails on `C:\Users\admin`. Commit: `1699974c2`.
- **Jest launcher reused the canonical bootstrap**: Extracted the existing env setup into `scripts/ensure-workspace-node-home.cjs` so direct Jest runs and wrapper-launched scripts share the same Node-side setup path.
- **Verification**: `.\scripts\node-safe.cmd -v`, `.\scripts\npm-safe.cmd test -- --help`, and `.\scripts\npm-safe.cmd run -s check:types` all passed locally.

## Session: 2026-03-12
- **Gmail tool send restored**: Confirmed the connected Gmail path was failing even after reconnect, enabled `gmail.googleapis.com` on `studio-567050101-bc6e8`, switched `src/server/integrations/gmail/send.ts` to direct Gmail REST bearer auth, and verified `sendGenericEmail()` succeeds with Mailjet and SendGrid disabled. Commits: `30505c5a3`, `3222c9933`.
- **Provider triage completed**: Confirmed SendGrid keys still fail live send while Martez's Gmail token, scopes, and raw bearer token access were valid, which narrowed the issue to Gmail API/project setup plus the sender implementation rather than token storage.
- **Verification**: Focused Gmail Jest suite passed and full repo `npm run -s check:types` passed after the sender fix.

### Gotchas (Gmail tool send restored)
- A valid Google OAuth token is not enough if `gmail.googleapis.com` is disabled on the OAuth consumer project.
- Raw bearer-token fetches against Gmail are the fastest way to separate token validity from `googleapis` client-path issues.

## Session: 2026-03-11
- **Outreach dashboard hardening**: Fixed the super-user outreach dashboard to degrade gracefully on missing Firestore indexes, added canonical Gmail token status checks, and added the missing outreach composite indexes. Commit: `8cf0a4b53`.
- **CRM-first outreach workflow**: Added `crm_dispensaries` → outreach queue sync with idempotent dedupe and queue refresh behavior so CRM leads feed the draft approval flow before legacy NY research. Commit: `8cf0a4b53`.
- **Multi-state expansion**: Expanded the proactive outreach pipeline, queue enrichment, templates, and CEO dashboard copy from NY-only to `NY`, `MI`, and `IL` while preserving the existing queue/draft/send collections and services. Commit: `8cf0a4b53`.
- **Verification**: Targeted Jest suites passed (`tests/server/actions/ny-outreach-dashboard.test.ts`, `tests/server/ny-outreach-crm-sync.test.ts`). Full repo `npm run -s check:types` did not finish locally within a 15-minute unrestricted run, so the release note should treat repo-wide typecheck as inconclusive rather than green.

## Session: 2026-03-06
- **Claude settings normalization**: Cleaned the repo-local Claude settings allowlists and removed startup-bloat regressions. Commit: `6f04200ee`.
- **Security Soren guidance**: Registered the new security agent docs, memory, and server security guidance. Commit: `2ae78a0b4`.
- **CEO GLM controls**: Added GLM settings and usage controls for the CEO dashboard. Commits: `17186202a`, `360cabc76`.
- **WordPress proxy hardening**: Restricted the public WordPress proxy to the configured Andrews origin and removed public debug leakage. Commit: `1aa587cb2`.
- **Release note**: Left the Andrews WordPress scratch files unshipped until the tracked runtime and deploy path are coherent and safe.

## Session: 2026-03-05
- **Claude Code Settings Bloat**: Fixed an issue where Claude Code's `.claude/settings.local.json` and global `~/.claude/settings.json` became bloated with 273 lines of multi-line git commit messages and invalid `:*` glob patterns that broken startup. Cleared settings and replaced with clean allowlist.
- **Claude Code GLM Proxy Auth**: Fixed 401 unresponsiveness by restoring the `ANTHROPIC_AUTH_TOKEN` in `~/.claude/settings.json`, required for the custom `https://api.z.ai/api/anthropic` proxy.
- **Commit Reference**: `[no-code-changes]` (environment configuration only).

## Problem Context

After extracting lead magnets and academy features to a separate app (commit `72e6549c`), the main application experienced:
1. **Build failures** due to orphaned module imports
2. **Out of Memory (OOM) errors** during Firebase App Hosting builds
3. **Module resolution errors** from deleted directories still being referenced

## Root Causes Identified

### 1. Orphaned Module References
- Commit `72e6549c` deleted 32 files (8,675 deletions) including:
  - `src/lib/academy/` - Academy curriculum and utilities
  - `src/components/academy/` - Academy UI components
  - `src/server/actions/training*` - Training platform actions
  - `src/server/services/academy-welcome*` - Email automation services
  - `src/app/vibe/beta/` - Vibe IDE beta features

### 2. Next.js 16 Server Action Restrictions
- `'use server'` files can only export async functions
- Barrel files that re-export from other `'use server'` files cause build errors
- Type exports from `'use server'` files are not allowed

### 3. Memory Management Issues
- 204 pages being statically pre-rendered at build time
- Turbopack memory overhead in Next.js 16
- Insufficient code splitting and parallelism limits

## Solutions Implemented

### Phase 1: Orphaned Module Cleanup

#### Deleted Directories
```
src/app/dashboard/academy/              # Academy dashboard pages
src/app/dashboard/academy-analytics/    # Academy analytics
src/app/dashboard/training/             # Training platform
src/app/api/academy/thumbnail/          # Academy thumbnail API
src/app/api/cron/scheduled-emails/      # Academy email cron
src/app/api/vibe/payment-config/        # Vibe beta payment API
```

#### Navigation Cleanup
- **brand-sidebar.tsx**: Removed Academy navigation link
- **dispensary-sidebar.tsx**: Removed Academy navigation link  
- **super-admin-sidebar.tsx**: Removed Academy and Academy Analytics links, restored Training Program link

#### Server Action Fixes
- **ceo/actions/index.ts**: Removed `'use server'` directive from barrel file (individual files already have it)
- **ceo/actions/index.ts**: Removed `export * from './types'` (types aren't async functions)
- **pilot-actions.ts**: Added missing `'use server'` directive

### Phase 2: Memory Optimizations

#### next.config.js
```javascript
experimental: {
  webpackMemoryOptimizations: true,  // Reduce webpack memory usage
  workerThreads: false,              // Disable worker threads to prevent memory spikes
}

webpack: (config, { isServer }) => {
  config.parallelism = 1;            // CRITICAL: Prevent parallel compilation OOM
  
  config.optimization = {
    splitChunks: {
      chunks: 'all',
      maxSize: 400000,               // Limit chunk sizes
      cacheGroups: {
        framework: { /* React, Next.js */ },
        firebase: { /* Firebase, Google Cloud */ },
        ui: { /* Radix, Framer Motion */ },
      }
    },
    concatenateModules: false,       // Save memory during build
  };
  
  config.cache = {
    type: 'filesystem',
    compression: 'gzip',
    maxMemoryGenerations: 1,         // Only keep 1 generation in memory
  };
  
  return config;
}

serverExternalPackages: [
  'genkit', 'firebase-admin', 'googleapis',
  '@google-cloud/monitoring', 'stripe', 'twilio',
  // ... heavy server-only dependencies
]

typescript: {
  ignoreBuildErrors: true,           // Run tsc separately to avoid duplicate compilation
}
```

#### apphosting.yaml
```yaml
env:
  - variable: NODE_OPTIONS
    value: "--max-old-space-size=12288"  # 12GB (reduced from 28GB to prevent SIGKILL)

runConfig:
  cpu: 4
  memoryMiB: 32768                       # 32GB total, 12GB for Node.js
```

#### package.json
```json
{
  "scripts": {
    "build": "npm run build:embed && npm run check:structure && next build --webpack"
  }
}
```

### Phase 3: Dashboard Stabilization

#### Global Dynamic Rendering
- **dashboard/layout.tsx**: Refactored to Server Component with `export const dynamic = 'force-dynamic'`
- **dashboard/layout-client.tsx**: Extracted client-side logic to separate component
- **Individual pages**: Removed redundant `export const dynamic = 'force-dynamic'` declarations

This prevents Next.js from attempting to statically pre-render 204 pages at build time, which was causing OOM errors.

## Results

### Before Fixes
```
❌ Failed to compile
❌ Module not found: Can't resolve '@/lib/academy/curriculum'
❌ Module not found: Can't resolve '@/server/services/academy-welcome'
❌ Error: Only async functions are allowed to be exported in a "use server" file
❌ SIGKILL 137 (Out of Memory)
```

### After Fixes
```
✅ Next.js 16.1.2 (webpack)
✅ Compiled successfully
✅ Generating static pages using 1 worker (142/142)
✅ Build completed successfully
✅ Exit code: 0
✅ Pages reduced from 204 → 142
```

## Key Learnings

### 1. Next.js 16 Server Actions
- **Never** put `'use server'` in barrel files that re-export from other `'use server'` files
- **Never** export types from `'use server'` files
- Each action file should have its own `'use server'` directive
- Consumers import directly from individual action files or from a plain barrel file (no directive)

### 2. Memory Management
- **Parallelism = 1** is critical for large Next.js apps to prevent OOM
- **12GB Node.js heap** is optimal for 32GB container (leaves room for OS)
- **Global dynamic rendering** prevents static pre-rendering of all pages
- **Aggressive code splitting** reduces per-chunk compilation memory

### 3. Code Extraction Hygiene
When extracting features to separate apps:
1. **Search for all imports** of deleted modules before committing
2. **Check navigation components** for orphaned links
3. **Audit API routes** that may reference deleted services
4. **Run a full build** to catch module resolution errors
5. **Use grep/ripgrep** to find all references: `rg "academy|training" --type ts --type tsx`

### 4. Build Optimization Strategy
1. **Force Webpack** over Turbopack for production builds (more stable, better optimizations)
2. **Externalize heavy dependencies** via `serverExternalPackages`
3. **Disable TypeScript checking** during build (run separately)
4. **Limit parallelism** to prevent memory spikes
5. **Use filesystem cache** with compression to speed up rebuilds

## Future Prevention

### Pre-Extraction Checklist
- [ ] Run `rg "module-name" --type ts --type tsx` to find all references
- [ ] Check all sidebar/navigation components
- [ ] Audit API routes and cron jobs
- [ ] Search for type imports and re-exports
- [ ] Run full build before committing

### Build Monitoring
- Monitor Firebase App Hosting build logs for memory usage
- Watch for SIGKILL 137 errors (OOM)
- Track build times and page counts
- Alert on build failures in CI/CD

### Code Organization
- Keep `'use server'` files focused on actions only
- Export types from separate `types.ts` files (no `'use server'`)
- Use plain barrel files for re-exports (no directives)
- Document heavy dependencies in `serverExternalPackages`

## Related Files

- [next.config.js](file:///c:/Users/admin/BakedBot%20for%20Brands/bakedbot-for-brands/next.config.js) - Webpack and memory optimizations
- [apphosting.yaml](file:///c:/Users/admin/BakedBot%20for%20Brands/bakedbot-for-brands/apphosting.yaml) - Firebase build configuration
- [dashboard/layout.tsx](file:///c:/Users/admin/BakedBot%20for%20Brands/bakedbot-for-brands/src/app/dashboard/layout.tsx) - Global dynamic rendering
- [ceo/actions/index.ts](file:///c:/Users/admin/BakedBot%20for%20Brands/bakedbot-for-brands/src/app/dashboard/ceo/actions/index.ts) - Server action barrel pattern

## Commit Reference

- **Extraction**: `72e6549c` - Extract lead magnets to separate app
- **Fix**: `a9f75fac` - Remove orphaned academy/training modules and fix server action exports
