# Firebase App Hosting Secret Management

**Critical Reference** — Secret Manager configuration and IAM binding patterns for Firebase App Hosting

> **TL;DR**: Always use `firebase apphosting:secrets:grantaccess`, never raw `gcloud` commands. Fresh deployments required after IAM changes.

---

## ⛔ ABSOLUTE RULE: NEVER HARDCODE SECRETS

**This happened (2026-02-17):** A Slack webhook URL was hardcoded in `scripts/setup-thrive-slack-heartbeat.ts`. GitHub's Push Protection blocked the push. The webhook was rotated, git history had to be rewritten. Wasted 1 hour.

**Never do this:**
```typescript
// ❌ SCRIPT — hardcoded secret
const SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/T.../B.../xxx';
const API_KEY = 'sk-1234567890abcdef';
```
```yaml
# ❌ apphosting.yaml — plaintext value (also blocks push)
- variable: MY_SECRET
  value: "actual-secret-value"
```

**Always do this:**
```typescript
// ✅ SCRIPT — environment variable with graceful fallback
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
if (!SLACK_WEBHOOK_URL) console.warn('[Setup] Set SLACK_WEBHOOK_URL env var first');
```
```yaml
# ✅ apphosting.yaml — Secret Manager reference
- variable: MY_SECRET
  secret: MY_SECRET
  availability: [RUNTIME]
```

GitHub scans every commit for: Slack webhooks, API keys, OAuth tokens, private keys, JWT secrets, etc. If found → push blocked → secret must be rotated → git history rewritten. It's not worth it.

---

## 🚨 PREPARER-STEP BUILD FAILURES (Build-Blocking)

**This happened (2026-02-19):** `FAL_API_KEY` was referenced in `apphosting.yaml` but the secret existed with **0 versions** and had no IAM binding. Firebase failed at the **preparer step** — before any compilation — with:

```
{"reason":"Misconfigured Secret","code":"fah/misconfigured-secret",
 "userFacingMessage":"Error resolving secret version with name=.../FAL_API_KEY/versions/latest..."}
```

This is **worse than a runtime error** — it blocks ALL deployments until fixed.

### Three Ways a Referenced Secret Can Fail at Build Time

| Cause | Symptom | Fix |
|-------|---------|-----|
| Secret doesn't exist | `fah/misconfigured-secret` | Create it + add version + grantaccess |
| Secret exists but **0 versions** | `fah/misconfigured-secret` (same error!) | `gcloud secrets versions add` |
| Secret has no IAM binding | `fah/misconfigured-secret` (same error!) | `firebase apphosting:secrets:grantaccess` |

### How to Distinguish Which Case You Have

```bash
# Step 1: Check secret exists and has versions
gcloud secrets versions list SECRET_NAME --project=studio-567050101-bc6e8
# "Listed 0 items." → secret exists but EMPTY — add a version
# Error "NOT_FOUND" → secret doesn't exist — create it
# Shows version(s) → secret has data, check IAM next

# Step 2: Check IAM bindings
gcloud secrets get-iam-policy SECRET_NAME --project=studio-567050101-bc6e8
# Look for: firebase-app-hosting-compute@ service accounts
# Missing? → run firebase apphosting:secrets:grantaccess
```

---

## The Problem

Firebase App Hosting secret references in `apphosting.yaml` may fail to resolve even with correct Secret Manager permissions. This manifests as:
- 500 Internal Server Error on endpoints using secrets
- Environment variables being `undefined` at runtime
- Health checks showing "Status Unknown"

**Root Cause:** Using `gcloud secrets add-iam-policy-binding` directly sets generic IAM permissions, but Firebase App Hosting requires **Firebase-specific IAM bindings** that can only be set via Firebase CLI.

---

## The Solution (Full 3-Step Checklist)

> Every step is required. Missing any one causes `fah/misconfigured-secret`.

### Step 1: Create Secret AND Add a Version

**IMPORTANT:** `gcloud secrets create` only creates the container — it does NOT add a version.
A secret with 0 versions causes the same build failure as a missing secret.

```bash
# ✅ RECOMMENDED: Create and populate in one command
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --data-file=- --project=studio-567050101-bc6e8

# If secret already exists but is empty (0 versions):
echo -n "your-secret-value" | gcloud secrets versions add SECRET_NAME --data-file=- --project=studio-567050101-bc6e8

# Verify it has a version:
gcloud secrets versions list SECRET_NAME --project=studio-567050101-bc6e8
# Must show at least 1 version (not "Listed 0 items.")
```

### Step 2: Grant Firebase App Hosting Access (CRITICAL)

```bash
# THIS IS THE KEY STEP - Use Firebase CLI, not gcloud!
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=your-backend-name

# Verify success (should show firebase-app-hosting-compute@ accounts)
gcloud secrets get-iam-policy SECRET_NAME --project=PROJECT_ID
```

**Why This Works:**
- Firebase CLI sets service account bindings: `firebase-app-hosting-compute@PROJECT.iam.gserviceaccount.com`
- These bindings are different from generic `secretAccessor` role
- Firebase App Hosting containers can only access secrets with these specific bindings

### Step 3: Reference Secret in apphosting.yaml

```yaml
env:
  # Without version pinning (uses latest at build time)
  - variable: MY_SECRET
    secret: SECRET_NAME
    availability:
      - RUNTIME

  # With version pinning (recommended for stability)
  - variable: MY_SECRET
    secret: SECRET_NAME@6
    availability:
      - RUNTIME
```

**Version Pinning Syntax:**
- `SECRET_NAME` → Latest version at build time (default behavior)
- `SECRET_NAME@6` → Pin to version 6 (stable, won't change on new secret versions)
- `SECRET_NAME@latest` → Explicitly use latest (same as no version)

### Step 4: Deploy to Pick Up IAM Bindings

**Important:** IAM binding changes only take effect on **new deployments**, not existing running containers.

```bash
# Option A: Make a code change and push
git add .
git commit -m "feat: Add secret integration"
git push origin main

# Option B: Force redeploy with empty commit
git commit --allow-empty -m "chore: Force redeploy for IAM binding propagation"
git push origin main
```

**Deployment Timeline:**
- Push to GitHub → Firebase App Hosting detects change
- Build starts (~5-10 minutes for Next.js apps)
- New container spins up with IAM bindings
- Traffic routes to new container
- Secret resolution works!

### Step 5: Verify Secret Resolution

```powershell
# Test that secret is accessible at runtime
# Example: Test a cron endpoint that uses the secret
$headers = @{ Authorization = "Bearer YOUR_SECRET_VALUE" }
Invoke-RestMethod -Uri "https://your-app.web.app/api/endpoint" -Headers $headers

# Check health endpoint
Invoke-RestMethod -Uri "https://your-app.web.app/api/system/health"
# Should return { healthy: true, pulse: "alive" } not { pulse: "unknown" }
```

---

## Common Mistakes

### ❌ Creating Secret Without Adding a Version

```bash
# WRONG — creates the secret container but leaves it empty (0 versions)
gcloud secrets create MY_SECRET --project=studio-567050101-bc6e8
# Result: "fah/misconfigured-secret" at build time — same error as missing secret!
```

```bash
# RIGHT — create AND populate in one step
echo -n "actual-value" | gcloud secrets create MY_SECRET --data-file=- --project=studio-567050101-bc6e8

# OR if secret already exists but is empty:
echo -n "actual-value" | gcloud secrets versions add MY_SECRET --data-file=- --project=studio-567050101-bc6e8
```

**Why this matters:** The preparer step (before compilation) reads all secrets referenced in `apphosting.yaml`. A secret with 0 versions is treated identically to a missing secret. The error `fah/misconfigured-secret` is the same in both cases — always check versions list first.

### ❌ Using gcloud Instead of Firebase CLI

```bash
# WRONG - Sets generic IAM permissions, won't work with App Hosting
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member='serviceAccount:SERVICE_ACCOUNT@PROJECT.iam.gserviceaccount.com' \
  --role='roles/secretmanager.secretAccessor' \
  --project=PROJECT_ID
```

```bash
# RIGHT - Sets Firebase-specific IAM bindings
firebase apphosting:secrets:grantaccess SECRET_NAME --backend=backend-name
```

### ❌ Not Redeploying After IAM Changes

**Problem:** You grant access via Firebase CLI, but the existing running container doesn't have the new bindings.

**Solution:** Always trigger a fresh deployment after running `firebase apphosting:secrets:grantaccess`.

### ❌ Hardcoding Secrets in apphosting.yaml

```yaml
# WRONG - Security risk, secrets in git
- variable: MY_SECRET
  value: "hardcoded-secret-value-bad-idea"
  availability:
    - RUNTIME
```

```yaml
# RIGHT - Secret Manager reference
- variable: MY_SECRET
  secret: MY_SECRET@6
  availability:
    - RUNTIME
```

### ❌ Testing Before Build Completes

**Problem:** You push code, immediately test, get 500 errors, think it's broken.

**Reality:** Firebase App Hosting takes 5-10 minutes to build and deploy.

**Solution:** Wait for build to complete before testing. Check Firebase Console → App Hosting → Builds.

---

## Debugging Checklist

If secrets aren't resolving (runtime) or build fails with `fah/misconfigured-secret` (build-time):

### 0. Check if It's a Preparer-Step Failure (Build-Blocking)
Build log shows `fah/misconfigured-secret` in the **preparer** step? This blocks all deployments.
Run the 3-step diagnostic below before anything else.

### 1. Check Secret Exists AND Has Versions
```bash
# Does the secret exist at all?
gcloud secrets describe SECRET_NAME --project=studio-567050101-bc6e8

# Does it have at least 1 version? (0 items = build will fail!)
gcloud secrets versions list SECRET_NAME --project=studio-567050101-bc6e8

# Can you read the value?
gcloud secrets versions access latest --secret=SECRET_NAME --project=studio-567050101-bc6e8
```
- `Listed 0 items.` → **Add a version**: `echo -n "value" | gcloud secrets versions add SECRET_NAME --data-file=- --project=studio-567050101-bc6e8`
- `NOT_FOUND` → Secret doesn't exist. Create it first.
- ✅ Returns value → Secret has data, check IAM next

### 2. Check IAM Bindings
```bash
gcloud secrets get-iam-policy SECRET_NAME --project=PROJECT_ID
```
- ✅ Should show `firebase-app-hosting-compute@` service accounts with `secretAccessor` role
- ❌ If missing → Run `firebase apphosting:secrets:grantaccess`

### 3. Check apphosting.yaml Syntax
```yaml
- variable: MY_SECRET
  secret: MY_SECRET@6  # ✅ Correct syntax
  availability:
    - RUNTIME
```

Common syntax errors:
- `secret: "MY_SECRET@6"` → Remove quotes
- `secret: MY_SECRET:6` → Use `@` not `:`
- `secret: MY_SECRET_VERSION_6` → Use `@` separator

### 4. Check Build Status
```bash
firebase apphosting:backends:list
# Look for "Updated Date" - should be recent (last 10 min)
```

### 5. Test Verbose Error Response
```powershell
# Create test-secret.ps1
try {
    $response = Invoke-WebRequest -Uri "https://your-app/api/endpoint" -Headers @{ Authorization = "Bearer SECRET_VALUE" }
    Write-Host "SUCCESS: $($response.StatusCode)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "ERROR: Status $statusCode"

    # 401 = Secret not resolving (auth failed)
    # 500 = Secret resolved, but execution failed (different issue)
}
```

**Error Code Meanings:**
- **401 Unauthorized** → Secret not resolving, environment variable is undefined/wrong
- **500 Internal Server Error** → Secret resolved OK, but execution failed (check logs for real error)
- **404 Not Found** → Route doesn't exist (deployment issue)

---

## Version Management

### When to Pin Versions

**Use Version Pinning When:**
- ✅ You want stable, predictable deployments
- ✅ You rotate secrets regularly (pin to stable version during rotation)
- ✅ Multiple environments need different secret versions

**Use Latest When:**
- ✅ You want automatic updates when secrets rotate
- ✅ Single environment with simple secret management
- ✅ You trust all team members with secret rotation

### How to Rotate Secrets

```powershell
# 1. Create new secret version
gcloud secrets versions add SECRET_NAME --data-file=new-secret.txt --project=PROJECT_ID

# 2. Get new version number
$newVersion = gcloud secrets versions list SECRET_NAME --limit=1 --format="value(name)" --project=PROJECT_ID

# 3. Update apphosting.yaml
# - variable: MY_SECRET
#   secret: SECRET_NAME@$newVersion  # e.g., SECRET_NAME@7

# 4. Deploy
git add apphosting.yaml
git commit -m "chore: Rotate MY_SECRET to version $newVersion"
git push origin main

# 5. Wait for deployment (5-10 min)

# 6. Test new version
powershell scripts/test-endpoint.ps1

# 7. Disable old versions (optional, after verifying new version works)
gcloud secrets versions disable $oldVersion --secret=SECRET_NAME --project=PROJECT_ID
```

---

## Automation Scripts

### Script: fix-secret.ps1
```powershell
# Add new secret version with value
param(
    [string]$SecretName,
    [string]$SecretValue,
    [string]$ProjectId = "your-project-id"
)

$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $SecretValue -NoNewline

gcloud secrets versions add $SecretName --data-file=$tempFile --project=$ProjectId

Remove-Item $tempFile

$latestVersion = gcloud secrets versions list $SecretName --limit=1 --format="value(name)" --project=$ProjectId

Write-Host "✅ Created version $latestVersion"
Write-Host "Update apphosting.yaml: secret: $SecretName@$latestVersion"
```

### Script: test-secret-resolution.ps1
```powershell
# Test if secret is resolving in deployed app
param(
    [string]$HealthEndpoint = "https://your-app/api/system/health"
)

$response = Invoke-RestMethod -Uri $HealthEndpoint

if ($response.pulse -eq "alive") {
    Write-Host "✅ Secret resolving correctly" -ForegroundColor Green
} else {
    Write-Host "❌ Secret not resolving (pulse: $($response.pulse))" -ForegroundColor Red
    Write-Host "Check Firebase Console → App Hosting → Builds"
}
```

---

## BakedBot Implementation (2026-02-16)

### The Journey

**Problem:** Heartbeat system showing "Status Unknown" gray indicator.

**Investigation:**
1. Health endpoint checking wrong document (`system/heartbeat` instead of `heartbeat_executions`)
2. Fixed health endpoint → Still unknown
3. Tried manual trigger → 401 Unauthorized
4. CRON_SECRET environment variable not resolving

**Attempted Solutions:**
1. ❌ `secret: CRON_SECRET` (no version) → 401 errors
2. ❌ `secret: CRON_SECRET@1` → 401 errors
3. ✅ Hardcoded value in apphosting.yaml → Worked! (but security risk)
4. ❌ `secret: CRON_SECRET@6` → 500 errors

**Root Cause Discovery:**
- Checked IAM permissions with `gcloud secrets get-iam-policy`
- Permissions looked correct (`secretAccessor` role set)
- BUT: Using raw gcloud doesn't set Firebase-specific bindings!

**The Fix:**
```bash
# Grant proper Firebase App Hosting access
firebase apphosting:secrets:grantaccess CRON_SECRET --backend=bakedbot-prod

# Force rebuild to pick up new IAM bindings
git commit --allow-empty -m "chore: Force redeploy for IAM binding propagation"
git push origin main

# Wait 10 minutes for build...

# Test
powershell scripts/test-heartbeat-verbose.ps1
# ✅ SUCCESS! 200 OK, execution ID: hb_1771257691235_0n98ig
```

**Result:**
- 🟢 Green heartbeat indicator
- All 13 cron jobs working
- Proper secret management (no hardcoded values)
- Secret version 6 with Cloud Scheduler value

### Current Configuration

**apphosting.yaml:**
```yaml
# CRON_SECRET - Proper Secret Manager reference with Firebase CLI IAM bindings (2026-02-16)
# Fixed by running: firebase apphosting:secrets:grantaccess CRON_SECRET --backend=bakedbot-prod
# Uses version 6 which contains Cloud Scheduler's actual value
- variable: CRON_SECRET
  secret: CRON_SECRET@6
  availability:
    - RUNTIME
```

**Scripts Created:**
- `scripts/fix-cron-secret.ps1` — Add new Secret Manager versions
- `scripts/check-secret-permissions.ps1` — Verify IAM bindings
- `scripts/test-heartbeat.ps1` — Manual trigger test
- `scripts/test-heartbeat-verbose.ps1` — Verbose error diagnostics
- `scripts/test-secret-resolution.ps1` — Deployment status check
- `scripts/force-redeploy.ps1` — Trigger rebuild for IAM propagation

**Documentation:**
- `HEARTBEAT_FIX.md` — Complete 150+ line debugging journey

---

## Key Takeaways

1. **Firebase CLI > gcloud** for all Firebase-specific operations
2. **3 steps required**: create secret → add version → grantaccess. All three. Every time.
3. **Secret with 0 versions = build fails** at preparer step — same error as missing secret
4. **Fresh deployments required** after IAM binding changes (empty commit forces rebuild)
5. **Version pinning** (`SECRET@6`) recommended for stability
6. **Preparer errors block ALL deploys** — fix immediately, don't wait
7. **401 vs 500 errors** help diagnose secret resolution vs execution issues at runtime
8. **Wait 5-10 minutes** after pushing code before testing
9. **Test verbose responses** to get detailed error information

---

## References

- [Firebase App Hosting Secrets Documentation](https://firebase.google.com/docs/app-hosting/configure)
- [Configuring Firebase App Hosting with Google Secrets Manager](https://medium.com/evenbit/configuring-firebase-app-hosting-with-google-secrets-manager-2b83c09f3ad9)
- [Managing Secrets in Firebase App Hosting for Next.js Applications](https://coffey.codes/articles/managing-secrets-firebase-apphosting-yaml-nextjs)

---

**Last Updated:** 2026-02-16
**Status:** ✅ Production-verified (BakedBot heartbeat system)
