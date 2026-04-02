---
date: 2026-04-02
time: 01:17
slug: ci-smoke-login-demo-fix
commits: []
features: [CI smoke suite, auth route age-gate bypass, demo bundle restoration]
---

## Session 2026-04-02 - CI smoke and login/demo hardening

- Removed `setImmediate` from `src/instrumentation.ts` so the Next instrumentation hook stays Edge-compatible while still sending best-effort incident notifications.
- Exempted `/brand-login`, `/dispensary-login`, `/customer-login`, and `/super-admin` from the public age-gate proxy path so auth entry routes are no longer treated like single-segment cannabis menu pages.
- Restored the demo shop's missing bundle cards by passing the existing `defaultBundles` into `BundleDealsSection`, which also re-enables the maintained bundle dialog path.
- Added a maintained Playwright smoke suite under `tests/e2e/ci-smoke/`, switched CI to `npm run test:e2e:ci`, and made `npm run dev` explicit about webpack so Playwright startup matches the repo's actual bundler configuration.

### Verification

- `.\scripts\npm-safe.cmd run test:e2e:ci -- --reporter=list` passed locally (4/4).
- Repo-wide `.\scripts\npm-safe.cmd run check:types` is currently blocked by an unrelated local type error in `src/app/dashboard/creative/page.tsx` (`"revision"` is not assignable to the existing status union).
- Elevated local `.\scripts\npm-safe.cmd run build` advanced through embed bundling, Remotion bundling, `check:structure`, and `check:config`, then entered `next build --webpack`; the run still hung in this Windows environment before completion, so full build verification remains worth confirming in CI.

### Gotchas

- Next 16 defaults `next dev` to Turbopack, so repos with a custom webpack config need an explicit `--webpack` flag for reliable Playwright/webServer startup.
- The age-gate proxy treats single-segment paths as public menu candidates, so auth routes must be excluded intentionally rather than relying on the generic pathname matcher.
