# Playbook Artifact Repo

## Purpose

Compiled Playbook V2 runs should leave behind durable engineering memory, not just transient runtime state.

The current artifact path writes to:

1. blob storage for durable retrieval
2. Firestore artifact metadata under each run
3. a dedicated Git repo for reviewable, diffable memory

Production artifact repo:

- `admin-baked/bakedbot-artifacts-prod`

## Key Runtime Files

- `src/server/services/playbook-artifact-service.ts`
- `src/server/services/playbook-artifact-runtime.ts`
- `src/server/services/playbook-artifact-memory.ts`
- `src/server/services/playbook-stage-runner.ts`
- `src/server/services/playbook-infra-adapters.ts`
- `src/server/services/playbook-run-coordinator.ts`
- `src/app/api/playbook-runs/[runId]/route.ts`
- `src/app/api/playbook-runs/[runId]/artifacts/route.ts`
- `src/app/api/playbook-runs/[runId]/validation/route.ts`
- `src/app/api/playbook-runs/[runId]/summary-for-ai-engineers/route.ts`

## Artifact Repo Contract

Repo-eligible compact artifacts include:

- `spec/v{n}.json`
- `run.json`
- `resolved_scope.json`
- `questions.json`
- `research_pack.md`
- `context_manifest.json`
- `output.md`
- `recommendations.json`
- `validation_report.json`
- `approval.json`
- `delivery_manifest.json`
- `error.json`
- `retry_context.json`
- `postmortem.md`
- `summary_for_ai_engineers.md`

High-volume raw source dumps should stay in blob storage and be referenced from compact manifests instead of being committed directly.

## Current Runtime Behavior

### Compile

`PlaybookCompilerService` persists:

- the playbook record
- version snapshots under `playbooks/{id}/versions/{version}`
- `spec/v{n}.json` through `PlaybookArtifactMemoryService`

### Run start

`PlaybookRunCoordinator` persists:

- `playbook_runs/{runId}`
- `run.json`

### Stage execution

`CloudTasksDispatcher` routes stage jobs through the existing agent job path with:

```json
{
  "isPlaybookStage": true
}
```

`handlePlaybookStageJob()` then:

- loads the run, spec, policy bundle, and prior artifacts
- executes the stage executor
- records stage telemetry
- persists delivery records
- persists failure artifacts on errors
- persists `summary_for_ai_engineers.md` for terminal states

## Environment and Secrets

App Hosting runtime expects:

- `PLAYBOOK_ARTIFACT_REPO_OWNER`
- `PLAYBOOK_ARTIFACT_REPO_NAME`
- `PLAYBOOK_ARTIFACT_REPO_BRANCH`
- `PLAYBOOK_ARTIFACT_REPO_COMMITTER_NAME`
- `PLAYBOOK_ARTIFACT_REPO_COMMITTER_EMAIL`
- `PLAYBOOK_ARTIFACT_REPO_TOKEN`

Current production wiring:

- project: `studio-567050101-bc6e8`
- backend: `bakedbot-prod`
- secret: `PLAYBOOK_ARTIFACT_REPO_TOKEN`

If owner/repo env vars are missing, runtime falls back to `GitArtifactRepoMock`. That fallback is acceptable for local development only.

## Deployment Rule

Provisioning the repo and secret is not enough by itself.
Production starts using the artifact repo only after App Hosting is running a source version that contains the updated `apphosting.yaml` and runtime code.

Because App Hosting deploys GitHub source, a local edit is not live until:

1. the relevant commit is pushed to `origin/main`
2. an App Hosting rollout is triggered for that remote source

## Failure Modes

- Missing repo env vars: repo commits silently downgrade to the mock store unless logs are checked
- Missing token secret or access: GitHub artifact writes fail while blob/metadata writes may still succeed
- Using current time instead of the run start time: one logical run can be split across dated repo folders
- Writing giant raw dumps to Git: noisy diffs, slow commits, poor signal for future agents

## Verification

Good checks after rollout:

- Run a compiled playbook manually
- Inspect `playbook_runs/{runId}/artifacts`
- Hit `GET /api/playbook-runs/{runId}/summary-for-ai-engineers`
- Confirm the matching files appear in `bakedbot-artifacts-prod`
