# Infrastructure & Grounding Gotchas

This document identifies non-obvious infrastructure patterns, resource limits, and build-time "gotchas" in the BakedBot AI codebase.

## 🚀 Firebase App Hosting (CI/CD)

The primary deployment pipeline is via **Firebase App Hosting**. Gated on `git push origin main`.

### Build-Time Memory (OOM Mitigation)
Next.js builds in this repo are extremely heavy due to large number of routes and AI integrations.
- **The Golden Setting**: `NODE_OPTIONS="--max-old-space-size=6144"` (6GB).
- **Gotcha**: 4GB causes OOM during webpack. 12GB also OOMs (likely due to Garbage Collection pauses exceeding Cloud Build timeouts). **Do not exceed 6GB at build time.**

### Runtime Memory
- **The Golden Setting**: `NODE_OPTIONS="--max-old-space-size=12288"` (12GB).
- Cloud Run instances are configured for 204MiB physical memory, but Node heap is set to 12GB for intensive AI synthesis.

### Secret Versioning
- **Strict Rule**: When adding a secret to `apphosting.yaml`, you **must** use a numeric version (e.g. `SECRET@5`).
- **Gotcha**: Using `SECRET@latest` will cause the rollout to fail or use stale values, as App Hosting snapshots the version at deploy time.

### Deployment Hangups
- Build RUNNING > 25 min with `Duration: unknown` is a known infra timeout.
- **Fix**: Use `node scripts/firebase-apphosting.mjs cancel <id>` and push an empty commit to re-trigger.

---

## 🤖 AI Agent Autonomy

### Linus CTO Service Account
Linus operates with `LINUS_SERVICE_ACCOUNT_KEY` which has `Editor` or custom IAM roles for:
- `Cloud Scheduler`: Proactively creates/modifies cron jobs.
- `Secret Manager`: Reads/writes operational secrets.
- `IAM`: Manages service account keys for automated tasks.

### Opencode (SP13) Cloud Run
The Opencode agent runs in a separate Cloud Run container (`OPENCODE_AGENT_URL`).
- **Access**: Requires `OPENCODE_SERVER_PASSWORD` (Basic Auth).
- **Grounding**: It is mounted with the repo at `/workspace/bakedbot-for-brands`. 
- **Gotcha**: It has its own `SYSTEM_PROMPT` in `docker/opencode/server.mjs`.

---

## 🛠️ Build Chain & Structure

### The Build Command
The build is not just `next build`. It is a multi-stage pipeline (see `apphosting.yaml` line 628):
1. `npm run build:embed` (Chatbot widget)
2. `scripts/ci-remotion-bundle.mjs` (Video generation bundle)
3. `npm run check:structure` (File organization guardrail)
4. `npm run check:config` (Environment validation)
5. `next build --webpack`

### TypeScript Checks (`tsc`)
- **Gotcha**: Running `tsc` on the full repo often OOMs local machines.
- **Standard**: Always use `.\scripts\npm-safe.cmd`. It wraps `tsc` with the correct heap memory and skip-libraries flags.

---

## 💬 Slack Operations

### Identity Bypassing
Slack requests use `SLACK_SYSTEM_USER`. 
- **Why**: HMAC signature verification is enough to prove the request came from Slack.
- **Gotcha**: This user has `role: super_user` and bypasses all Firebase Auth checks to allow agents to touch Firestore/Tools directly.

### Bot Tokens
- **Linus**: Uses its own dedicated bot token (`SLACK_LINUS_BOT_TOKEN`) for direct channel posts.
- **Elroy**: Uses `SLACK_ELROY_BOT_TOKEN`.
- **Shared**: The main app uses `SLACK_BOT_TOKEN`.
- **Gotcha**: Replying to a thread in a DM requires the same token that started the DM. See `selectSlackService` in `slack.ts`.
