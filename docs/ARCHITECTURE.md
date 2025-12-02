# CI/CD Pipeline Diagram & Architecture

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR LOCAL MACHINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Write/Update Tests                                           │
│     └─ e2e/*.spec.ts                                             │
│                                                                   │
│  2. Test Locally                                                 │
│     ├─ npm run test:e2e ✅                                       │
│     ├─ npm run check:types ✅                                    │
│     ├─ npm run check:lint ✅                                     │
│     └─ npm run build ✅                                          │
│                                                                   │
│  3. Commit Changes                                               │
│     └─ git commit -m "feat: ..."                                 │
│                                                                   │
│  4. Push to GitHub                                               │
│     └─ git push origin feat/branch-name                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB REPOSITORY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Webhook Triggered → GitHub Actions Started                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Three Workflows Run in Parallel:                           │ │
│  │                                                              │ │
│  │  Workflow 1: build.yml                                      │ │
│  │  ├─ Setup Node 20.x                                         │ │
│  │  ├─ npm ci                                                  │ │
│  │  └─ npm run build                                           │ │
│  │      Result: ✅ Build Successful                            │ │
│  │                                                              │ │
│  │  Workflow 2: type-check.yml                                 │ │
│  │  ├─ Setup Node 20.x                                         │ │
│  │  ├─ npm ci                                                  │ │
│  │  ├─ npm run check:types                                     │ │
│  │  ├─ npm run check:lint                                      │ │
│  │  └─ npm run check:structure                                 │ │
│  │      Result: ✅ All Checks Pass                             │ │
│  │                                                              │ │
│  │  Workflow 3: e2e-tests.yml (Matrix: 2 Node versions)        │ │
│  │  ├─ Matrix Strategy: [18.x, 20.x]                           │ │
│  │  │                                                          │ │
│  │  ├─ For Each Node Version:                                  │ │
│  │  │  ├─ Setup Node X.x                                       │ │
│  │  │  ├─ npm ci                                               │ │
│  │  │  ├─ npx playwright install --with-deps                   │ │
│  │  │  ├─ npm run build                                        │ │
│  │  │  ├─ npm run test:e2e                                     │ │
│  │  │  └─ Results: 49 tests ✅ or ❌                            │ │
│  │  │                                                          │ │
│  │  └─ Artifacts Uploaded (30 days retention)                  │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PULL REQUEST PAGE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Status Checks Section:                                          │
│  ├─ ✅ build                                                     │
│  ├─ ✅ type-check                                                │
│  ├─ ✅ test (18.x)                                               │
│  └─ ✅ test (20.x)                                               │
│                                                                   │
│  Result:                                                         │
│  ├─ If All Pass ✅                                               │
│  │  └─ PR can be merged                                         │
│  │     [Merge Pull Request] button active                       │
│  │                                                              │
│  └─ If Any Fail ❌                                               │
│     └─ Cannot merge until fixed                                 │
│        [Merge Pull Request] button disabled                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              MERGE TO MAIN & DEPLOY (Optional)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  After Merge:                                                    │
│  ├─ Runs tests again on main branch                              │
│  ├─ Deployment pipelines can be triggered                        │
│  ├─ Team sees new code with passing tests                        │
│  └─ Regression prevention ✅                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Details

### Build Workflow
```
┌──────────────────────────────────────────┐
│         build.yml Execution              │
├──────────────────────────────────────────┤
│ Ubuntu Latest                            │
│ Node: 20.x                               │
│ Time: ~2 min                             │
│                                          │
│ Steps:                                   │
│ 1. Checkout code                         │
│ 2. Setup Node 20.x                       │
│ 3. npm ci (clean install)                │
│ 4. npm run build                         │
│ 5. Upload .next/ artifacts               │
│                                          │
│ Result: ✅ Next.js app builds            │
└──────────────────────────────────────────┘
```

### Type Check & Lint Workflow
```
┌──────────────────────────────────────────┐
│      type-check.yml Execution            │
├──────────────────────────────────────────┤
│ Ubuntu Latest                            │
│ Node: 20.x                               │
│ Time: ~1-2 min                           │
│                                          │
│ Steps:                                   │
│ 1. Checkout code                         │
│ 2. Setup Node 20.x                       │
│ 3. npm ci                                │
│ 4. npm run check:types                   │
│ 5. npm run check:lint                    │
│ 6. npm run check:structure               │
│ 7. npm run check:routes                  │
│                                          │
│ Result: ✅ All code quality checks pass  │
└──────────────────────────────────────────┘
```

### E2E Tests Workflow (Multi-Matrix)
```
┌──────────────────────────────────────────────────────────────┐
│         e2e-tests.yml Execution (Parallel)                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │  Node 18.x Matrix Job   │  │  Node 20.x Matrix Job   │   │
│  ├─────────────────────────┤  ├─────────────────────────┤   │
│  │ Ubuntu Latest           │  │ Ubuntu Latest           │   │
│  │ Node: 18.x              │  │ Node: 20.x              │   │
│  │ Time: ~3-5 min          │  │ Time: ~3-5 min          │   │
│  │                         │  │                         │   │
│  │ 1. Checkout             │  │ 1. Checkout             │   │
│  │ 2. Setup Node 18.x      │  │ 2. Setup Node 20.x      │   │
│  │ 3. npm ci               │  │ 3. npm ci               │   │
│  │ 4. Playwright install   │  │ 4. Playwright install   │   │
│  │ 5. npm run build        │  │ 5. npm run build        │   │
│  │ 6. npm run test:e2e     │  │ 6. npm run test:e2e     │   │
│  │    ├─ 49 tests run      │  │    ├─ 49 tests run      │   │
│  │    └─ Results: ✅/❌    │  │    └─ Results: ✅/❌    │   │
│  │ 7. Upload playwright    │  │ 7. Upload playwright    │   │
│  │    report               │  │    report               │   │
│  │ 8. Upload test results  │  │ 8. Upload test results  │   │
│  │ 9. Comment PR           │  │ 9. Comment PR           │   │
│  │                         │  │                         │   │
│  │ Result: ✅ Both Pass    │  │ Result: ✅ Both Pass    │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│           (Parallel)                                          │
│           ~3-5 min (not 6-10)                                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Timeline

### First Run (After Feature Branch Push)
```
T+0 min   : Push code to GitHub
T+1 min   : GitHub Actions triggered, workflows start
T+2 min   : All 3 workflows running in parallel
T+5 min   : Workflows complete
T+5.5 min : PR status updated with results
T+6 min   : Developer reviews results, can merge if ✅
```

### Subsequent Runs (Same Process)
```
Each push = Same ~6 minute cycle
Multiple PRs = Parallel execution possible
```

---

## File Organization After Setup

```
bakedbot-for-brands/
├── .github/
│   └── workflows/
│       ├── build.yml                 ← Build verification
│       ├── type-check.yml            ← Type & lint checks
│       └── e2e-tests.yml             ← E2E test runner
│
├── e2e/
│   ├── api-health.spec.ts            ← New: API tests (5)
│   ├── navigation.spec.ts            ← New: Navigation tests (6)
│   ├── error-handling.spec.ts        ← New: Error tests (7)
│   ├── accessibility.spec.ts         ← New: A11y tests (8)
│   ├── security.spec.ts              ← New: Security tests (8)
│   ├── smoke.spec.ts                 ← New: Smoke tests (15)
│   │                                 Total: 49 new tests
│   │
│   ├── auth.spec.ts                  ← Existing
│   ├── checkout.spec.ts              ← Existing
│   ├── core.spec.ts                  ← Existing
│   ├── dashboard.spec.ts             ← Existing
│   ├── home.spec.ts                  ← Existing
│   ├── menu.spec.ts                  ← Existing
│   ├── onboarding.spec.ts            ← Existing
│   └── products.spec.ts              ← Existing
│
├── playwright.config.ts              ← Updated: CI optimizations
├── .gitignore                        ← Updated: Playwright artifacts
│
├── CI_CD_SETUP.md                    ← New: Setup guide
├── CI_CD_SUMMARY.md                  ← New: This document
├── PUSH_GUIDE.md                     ← New: Push instructions
├── TEST_EXPANSION_SUMMARY.md         ← New: Test details
└── CHECKLIST.md                      ← New: Pre-push checklist
```

---

## Key Points

✅ **Automated:** Runs without manual intervention
✅ **Parallel:** 3 workflows run simultaneously
✅ **Fast:** Completes in ~6 minutes
✅ **Safe:** Blocks merging on failures
✅ **Visible:** Everyone sees results on GitHub
✅ **Persistent:** Artifacts kept for 30 days
✅ **Free:** Uses GitHub free tier

---

## Next Steps

1. **Review:** Read `CI_CD_SUMMARY.md` (this file)
2. **Prepare:** Follow `CHECKLIST.md`
3. **Push:** Follow `PUSH_GUIDE.md`
4. **Monitor:** Watch GitHub Actions tab
5. **Merge:** After all checks pass

**Estimated total time: 30 minutes** ⏱️
