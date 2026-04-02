---
date: 2026-04-02
time: 09:36
slug: thrive-postdeploy-smoke-runbooks
commits: [896bf5afe]
features: [Thrive post-deploy smoke runbooks, public check-in retest operator script]
---

## Session 2026-04-02 - Thrive post-deploy smoke runbooks

- Added a tracked copy of `dev/testing/thrive_syracuse_master.md` with a post-deploy retest addendum for the new public check-in behavior, including full-phone returning lookup, staff-assisted first-name-plus-last-4, and a net-new safety pass (`896bf5afe`).
- Added `dev/testing/thrive_syracuse_postdeploy_operator_script.md` as a tighter operator-facing runbook for the live smoke on `https://bakedbot.ai/thrivesyracuse/rewards#check-in`.
- Recorded the live production baseline in the docs: deploy status, E2E status, `phoneLast4` indexes ready, and Thrive customer backfill completion.

### Verification

- Confirmed GitHub Actions on `main` completed successfully for App Hosting deploy, Type Check & Lint, and E2E.
- Confirmed production `phoneLast4` Firestore indexes exist and are `READY`.
- Confirmed Thrive backfill state after the live admin write: `15` customer docs scanned, `0` still missing `phoneLast4`.

### Gotchas

- The Thrive testing docs live under `dev/`, which is gitignored in this repo, so the doc commit intentionally force-added only the two Thrive smoke files and nothing else from `dev/`.
