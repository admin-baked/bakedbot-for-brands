---
date: 2026-04-02
time: 02:39
slug: inbox-live-streaming
commits: [594a21441]
features: [Inbox live async streaming, shared async job contract cleanup, inbox stop-response action]
---

## Session 2026-04-02 - Inbox live streaming

- Updated the inbox conversation UX so async jobs create an assistant placeholder immediately, stream live thought steps plus draft answer text into that same bubble, and finalize a single stable assistant message instead of appending duplicates at completion.
- Reused the canonical job pipeline by centralizing async draft/result sanitization in `src/server/jobs/job-stream.ts`, sharing the `AgentJobStatus` / `AgentJobDraftState` contract through `src/types/agent-job.ts`, and moving synchronous fallback terminal writes onto the same job-stream helpers.
- Tightened the production behavior after `/simplify`: preview updates now happen only when a final assistant response is committed, inbox cancellation uses an inbox-scoped server action instead of importing a CEO action module, VM artifact polling no longer blocks live reply streaming, and draft publishes queue off the token path instead of awaiting Firestore on every chunk.
- Added focused store and architecture coverage for placeholder finalization, shared cancel wiring, and the job-stream helper path.

### Verification

- `cmd /c npm test -- tests/components/inbox/inbox-conversation.test.tsx src/lib/store/__tests__/inbox-store.test.ts src/components/inbox/__tests__/inbox-conversation-thinking.test.tsx --runInBand` passed.
- `cmd /c .\scripts\node-safe.cmd .\node_modules\typescript\bin\tsc -p tsconfig.inbox-stream-check.json --pretty false` passed using a temporary scoped config for the release files.
- Repo-wide `cmd /c npm run -s check:types` timed out twice in this shell, so full-project type health is still worth rerunning in a longer-lived shell when unrelated churn settles.

### Gotchas

- Thread preview updates should stay explicit at the inbox finalization point; baking them into the generic message-update store action causes live draft streaming to churn the thread list and can rewrite previews from non-terminal edits.
- If draft publishing sits directly in the token stream hot path, long answers can feel slower than they need to. Queueing writes in `JobDraftPublisher` keeps the UX responsive while still persisting the latest draft.
