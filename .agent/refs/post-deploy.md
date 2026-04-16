# Post-Deploy Protocol

**MANDATORY after every `git push origin main`.**

---

## Step 1 — Poll until deploy completes

```bash
RUN_ID=$(gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 1 --json databaseId -q '.[0].databaseId')
while true; do
  STATUS=$(gh run view $RUN_ID --json status,conclusion -q '.status + "|" + (.conclusion // "")')
  echo "$(date '+%H:%M:%S') $STATUS"
  [[ "$STATUS" == *"completed"* ]] && break
  sleep 60
done
echo "Deploy result: $STATUS"
```

Typical build time: **18–22 minutes**. Run in background (`run_in_background: true`) so you can keep working.

---

## Step 2 — If deploy failed: diagnose

```bash
# Check which step failed
gh run view $RUN_ID --json jobs -q '.jobs[].steps[] | select(.conclusion == "failure") | .name'

# Common failure: stuck previous build blocking the queue
node scripts/firebase-apphosting.mjs status   # find RUNNING build
node scripts/firebase-apphosting.mjs cancel <cloud-build-id>  # cancel it
git commit --allow-empty -m "chore: trigger redeploy after cancelling stuck build" && git push origin main
```

---

## Step 3 — After successful deploy: run post-deploy triggers

For **Thrive Syracuse** (or any org with POS sync), trigger immediate sync after deploy:

```bash
CRON_SECRET=$(grep "^CRON_SECRET=" .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
BASE="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"

curl -s -X POST "$BASE/api/cron/pos-sync?orgId=org_thrive_syracuse" \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Length: 0"
```

**Expected:** `{"success":true,"results":{"menuProductsCount":N}}` where N > 0.

---

## Post-deploy trigger map

| Change type | Post-deploy action |
|-------------|-------------------|
| POS adapter / product sync | `POST /api/cron/pos-sync?orgId=org_thrive_syracuse` |
| Playbook logic | Verify Welcome Playbook is ACTIVE (`launch-thrive-full.mjs`) |
| Cron auth / scheduler | Re-run `node scripts/launch-thrive-full.mjs` to update jobs |
| Any Thrive-facing change | `POST /api/cron/pos-sync` + spot-check loyalty tablet |

---

## Step 4 — Update recent work (session end)

After successful deploy + triggers:

```
"Update recent work"
```

Runs the full session-end protocol (CLAUDE.md → "Session End" section).

**Rule:** A coding session isn't complete until memory is updated. Deploy ≠ done.

---

## Stuck build gotcha

Firebase App Hosting queues builds. If a build hangs (> 25 min, `Duration: unknown`):
1. `node scripts/firebase-apphosting.mjs status` → find RUNNING build > 25 min
2. `node scripts/firebase-apphosting.mjs cancel <id>` → cancel it
3. `git commit --allow-empty -m "chore: retrigger deploy" && git push`

---

## Production URL

```
https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app
```

Format: `https://{backend}--{project}.{region}.hosted.app`

**NOT** `https://bakedbot-prod.web.app` (404 — Firebase App Hosting ≠ Firebase Hosting)
