# Playbook Pablo - Artifact Runtime Memory

## Current State

Playbooks now have two runtime paths in this repo:

1. Legacy template/assignment playbooks
   - Template library, assignment editor, cron-based assignment execution
   - Main records: `playbook_assignments`, `playbook_executions`

2. Compiled Playbook V2
   - Natural-language compile to deterministic state machine
   - Main records: `playbooks`, `playbooks/{id}/versions/{version}`, `playbook_runs`
   - Artifact memory path: blob storage + Firestore artifact metadata + dedicated Git repo

Do not collapse these into one mental model. They coexist.

## V2 Runtime Flow

1. `POST /api/playbooks/compile`
   - compiles a canonical spec
   - persists the playbook record
   - persists `spec/v{n}.json` through `PlaybookArtifactMemoryService`

2. `POST /api/playbooks/{playbookId}/runs`
   - starts a `playbook_runs/{runId}` record
   - persists `run.json`
   - enqueues the first stage through `CloudTasksDispatcher`

3. `/api/jobs/agent`
   - detects `options.context.isPlaybookStage`
   - routes to `handlePlaybookStageJob()`

4. `handlePlaybookStageJob()`
   - loads run/spec/policy/artifacts
   - executes the stage executor
   - records stage telemetry
   - persists failure artifacts on crash/failure
   - persists `summary_for_ai_engineers.md` when the run reaches `awaiting_approval`, `completed`, or `failed`

## Artifact Memory Files

Important repo-eligible files now include:

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

## Key Files

- `src/server/services/playbook-artifact-service.ts`
- `src/server/services/playbook-artifact-runtime.ts`
- `src/server/services/playbook-artifact-memory.ts`
- `src/server/services/playbook-stage-runner.ts`
- `src/server/services/playbook-infra-adapters.ts`
- `src/server/services/playbook-run-coordinator.ts`

## Repo + Secret Configuration

App Hosting runtime expects:

- `PLAYBOOK_ARTIFACT_REPO_OWNER`
- `PLAYBOOK_ARTIFACT_REPO_NAME`
- `PLAYBOOK_ARTIFACT_REPO_BRANCH`
- `PLAYBOOK_ARTIFACT_REPO_COMMITTER_NAME`
- `PLAYBOOK_ARTIFACT_REPO_COMMITTER_EMAIL`
- `PLAYBOOK_ARTIFACT_REPO_TOKEN`

Current production target:

- repo: `admin-baked/bakedbot-artifacts-prod`
- secret: `PLAYBOOK_ARTIFACT_REPO_TOKEN`
- backend: `bakedbot-prod`
- project: `studio-567050101-bc6e8`

## Operational Rule

If the repo env vars are missing, the runtime falls back to `GitArtifactRepoMock`.
That is acceptable for local development only. It is not the intended production mode.
