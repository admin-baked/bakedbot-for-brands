---
date: 2026-04-02
time: 14:15
slug: scheduler-billing-export
commits: [uncommitted]
features: [Cloud Scheduler cleanup, BigQuery billing export dataset prep, pricing export guidance]
---

## Session 2026-04-02 - Scheduler cleanup and billing export prep

- Audited the April 1-2, 2026 Thrive Syracuse pilot cost spike and confirmed duplicate Cloud Scheduler traffic on `/api/jobs/welcome` and `/api/cron/pos-sync`, plus auth drift where several Thrive jobs were still configured for OIDC while the routes expect `Authorization: Bearer $CRON_SECRET`.
- Updated live Cloud Scheduler on April 2, 2026 so `process-welcome-jobs`, `thrive-loyalty-sync`, and `thrive-playbook-runner` now send the bearer header, then paused the duplicate `welcome-email-processor` and `thrive-pos-sync` jobs.
- Enabled `bigquery.googleapis.com` and `bigquerydatatransfer.googleapis.com`, then created the US multi-region dataset `studio-567050101-bc6e8:billing_export` so Standard, Detailed, and Pricing exports can be turned on from the Cloud Billing console without more dataset/API prep.
- Updated `CLOUD_SCHEDULER_SETUP.md` to remove the stale service-account flow and document the live bearer-header pattern for the welcome job processor.
- Ran the required `/simplify` review on the current pending diff; Code Reuse, Code Quality, and Efficiency all returned no confirmed findings because the remaining local patch is documentation-only.

### Verification

- Live GCP updates succeeded for the targeted scheduler jobs and pause operations.
- BigQuery dataset creation succeeded for `studio-567050101-bc6e8:billing_export` in `US`.
- `.\scripts\npm-safe.cmd run check:types` failed because of unrelated local video work in `src/app/api/ai/video/chain/route.ts`, `src/app/dashboard/creative/page.tsx`, and `src/remotion/Root.tsx`, not because of the scheduler or billing-export docs work.

### Gotchas

- Pricing export still must be enabled in the Cloud Billing console; Google does not provide a supported `gcloud` flow for that step.
- Pricing data is not retroactive and can take up to 48 hours to appear after enablement, so enable it immediately if you want next-month baselines in place.
- Because the dataset is US multi-region and this is the first export setup, Standard and Detailed exports can backfill current and previous month data after enablement, but that retroactive backfill does not apply to Pricing export.
