---
date: 2026-04-02
time: 11:18
slug: apphosting-deploy-diagnostics
commits: [uncommitted]
features: [App Hosting deploy diagnostics, explicit Cloud Build and rollout polling]
---

## Session 2026-04-02 - App Hosting deploy diagnostics

- Diagnosed the April 2, 2026 deploy that showed up as `56 min 35 sec`: the long-running item was Cloud Build `fe857d24-cd89-4d13-af51-a68d481dcbc4`, not a slow Git push or a slow GitHub Actions checkout.
- Tied that failed build to commit `d168d3d68ccdf83893d8fb434cfe727715de48d4` (`fix(inbox): restore seeded prompt flow`) and confirmed the GitHub workflow failed after the Firebase CLI rollout poll hit its built-in 25 minute timeout while the downstream Cloud Build kept running until `INTERNAL_ERROR`.
- Extended `scripts/firebase-apphosting.mjs` with repo-native `describe`, `resolve`, and `wait` commands so CI and local ops share one App Hosting diagnostic path for Cloud Build IDs, App Hosting build IDs, rollout state, and build log URLs.
- Updated `.github/workflows/deploy.yml` to deploy the exact pushed commit, stream and cap the Firebase CLI trigger window, resolve the real Cloud Build/App Hosting IDs, then explicitly wait on Cloud Build plus rollout completion before reporting success or failure.
- Added structured failure context to the deploy alert payload so future failures include the Cloud Build ID, App Hosting build ID, and build log URL.

### Verification

- `node scripts/firebase-apphosting.mjs describe fe857d24-cd89-4d13-af51-a68d481dcbc4 --json`
- `node scripts/firebase-apphosting.mjs resolve --commit d168d3d68ccdf83893d8fb434cfe727715de48d4 --after 2026-04-02T14:10:00Z --json`
- `node scripts/firebase-apphosting.mjs wait --cloud-build 619cc73d-e9c5-41b2-a70b-7733630b5423 --apphosting-build build-2026-04-02-009 --timeout-minutes 1 --json`
- `node scripts/firebase-apphosting.mjs wait --cloud-build fe857d24-cd89-4d13-af51-a68d481dcbc4 --apphosting-build build-2026-04-02-010 --timeout-minutes 1 --json` produced the expected structured failure payload with `INTERNAL_ERROR`

### Gotchas

- `firebase apphosting:rollouts:create` uses a built-in 25 minute poll timeout in the CLI, so a GitHub deploy run can fail long before the underlying App Hosting build finishes.
- The failed Cloud Build log reached the main Next.js build/static generation path and then stopped without an application stack trace, which points more to App Hosting / Cloud Build failure handling than to a clean app-thrown error.
