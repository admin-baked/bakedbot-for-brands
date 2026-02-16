# Firebase App Hosting Secret Management

**Critical Reference** — Secret Manager configuration and IAM binding patterns for Firebase App Hosting

> **TL;DR**: Always use `firebase apphosting:secrets:grantaccess`, never raw `gcloud` commands. Fresh deployments required after IAM changes.

---

## The Problem

Firebase App Hosting secret references in `apphosting.yaml` may fail to resolve even with correct Secret Manager permissions. This manifests as:
- 500 Internal Server Error on endpoints using secrets
- Environment variables being `undefined` at runtime
- Health checks showing "Status Unknown"

**Root Cause:** Using `gcloud secrets add-iam-policy-binding` directly sets generic IAM permissions, but Firebase App Hosting requires **Firebase-specific IAM bindings** that can only be set via Firebase CLI.

---

## The Solution

### Step 1: Create Secret in Secret Manager

```powershell
# Option A: Using gcloud
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --data-file=- --project=PROJECT_ID

# Option B: Using PowerShell script
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value "your-secret-value" -NoNewline
gcloud secrets versions add SECRET_NAME --data-file=$tempFile --project=PROJECT_ID
Remove-Item $tempFile
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

If secrets aren't resolving:

### 1. Check Secret Exists
```bash
gcloud secrets versions access latest --secret=SECRET_NAME --project=PROJECT_ID
```
- ✅ Should return the secret value
- ❌ If error → Secret doesn't exist or you don't have access

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
2. **Fresh deployments required** after IAM binding changes
3. **Version pinning** (`SECRET@6`) recommended for stability
4. **401 vs 500 errors** help diagnose secret resolution vs execution issues
5. **Wait 5-10 minutes** after pushing code before testing
6. **Test verbose responses** to get detailed error information

---

## References

- [Firebase App Hosting Secrets Documentation](https://firebase.google.com/docs/app-hosting/configure)
- [Configuring Firebase App Hosting with Google Secrets Manager](https://medium.com/evenbit/configuring-firebase-app-hosting-with-google-secrets-manager-2b83c09f3ad9)
- [Managing Secrets in Firebase App Hosting for Next.js Applications](https://coffey.codes/articles/managing-secrets-firebase-apphosting-yaml-nextjs)

---

**Last Updated:** 2026-02-16
**Status:** ✅ Production-verified (BakedBot heartbeat system)
