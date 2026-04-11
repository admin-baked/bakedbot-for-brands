# Scripts

Reusable scripts organized by purpose. Run from repo root.

## testing/ — QA & Pressure Tests

| Script | Usage | Purpose |
|--------|-------|---------|
| `run-pressure-tests.mjs` | `node scripts/testing/run-pressure-tests.mjs` | Run agent pressure tests against production (question-by-question, auto-grading) |
| `test-marty.ts` | `npx tsx scripts/testing/test-marty.ts "question"` | Single-question Marty test harness |
| `qa-benchmark.md` | Reference | Benchmark results from 2026-04-10 (Marty 78%, Linus 35%, Elroy 93%) |
| `club-mvp-test-plan.md` | Reference | Club/Rewards MVP test plan with test accounts and flows |

## ops/ — Operational & Maintenance

| Script | Usage | Purpose |
|--------|-------|---------|
| `reset-demo-checkin.mjs` | `node scripts/ops/reset-demo-checkin.mjs` | Reset demo account (312-684-0522) for fresh check-in testing |
| `ingest-cannabis-science.mjs` | `node scripts/ops/ingest-cannabis-science.mjs --pilot` | Ingest cannabis science Q&A into Supabase pgvector KB |
| `find-dead-services.mjs` | `node scripts/ops/find-dead-services.mjs` | Find service files with zero imports (dead code) |
| `find-dead-tools.mjs` | `node scripts/ops/find-dead-tools.mjs` | Find agent tools with zero references (dead code) |
| `slack-marty-manifest.yaml` | Reference | Slack app manifest for Marty Benjamins bot |

## data/ — Firestore Queries & Data Investigation

| Script | Usage | Purpose |
|--------|-------|---------|
| `alleaves-customers.mjs` | `node scripts/data/alleaves-customers.mjs` | Query Alleaves customer data from Firestore |
| `investigate-emails.mjs` | `node scripts/data/investigate-emails.mjs` | Investigate email matching between customer collections |
| `spending-sample.mjs` | `node scripts/data/spending-sample.mjs` | Sample customer spending data |

## heygen/ — Video Generation

| Script | Usage | Purpose |
|--------|-------|---------|
| `generate-videos.mjs` | `node scripts/heygen/generate-videos.mjs` | Generate HeyGen onboarding videos with Martez avatar |
| `screenshots/` | Reference | Screenshots for video backgrounds (mostly broken — see `docs/screenshots/CATALOG.md`) |
