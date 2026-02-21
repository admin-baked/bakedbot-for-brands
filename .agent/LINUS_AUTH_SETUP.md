# Linus CTO Authentication Setup

> **Date Created:** 2026-02-21
> **Status:** ✅ Active
> **Service Account:** claude-scheduler-admin@studio-567050101-bc6e8.iam.gserviceaccount.com

---

## Overview

Linus (CTO Agent) now has autonomous authentication to run `gcloud` and `firebase` CLI commands without manual login.

Two authentication methods are now available:

1. **Claude Code (Local)** — Uses Application Default Credentials (ADC)
2. **Linus (Backend)** — Uses service account key stored in Google Secret Manager

---

## Method 1: Claude Code (Local Development)

### Setup ✅ Complete

```powershell
gcloud auth application-default login
```

**Credentials Location:** `C:\Users\admin\AppData\Roaming\gcloud\application_default_credentials.json`

**What it enables:**
- `gcloud` commands run autonomously
- `firebase` CLI commands work without re-authentication
- All subsequent sessions inherit these credentials

### Available Commands

```bash
gcloud secrets list --project=studio-567050101-bc6e8
gcloud scheduler jobs list --location=us-central1 --project=studio-567050101-bc6e8
firebase projects:list
firebase apphosting:secrets:list --backend=bakedbot-prod
```

---

## Method 2: Linus (Backend/Cloud)

### Setup ✅ Complete

**Service Account Key:** Created and stored as secret `LINUS_SERVICE_ACCOUNT_KEY@1`

**Roles Granted:**
- `roles/editor` — Full access (git, Cloud Scheduler, IAM, Secrets, Cloud Build, etc.)
- `roles/cloudscheduler.admin` — Cloud Scheduler operations
- `roles/datastore.user` — Firestore/Firestore operations
- `roles/viewer` — Read-only access

### How Linus Uses It

In `src/server/agents/linus.ts`, the service account key is retrieved from the environment variable:

```typescript
const saKeyJson = process.env.LINUS_SERVICE_ACCOUNT_KEY;

if (!saKeyJson) {
  throw new Error('[Linus] LINUS_SERVICE_ACCOUNT_KEY environment variable not set');
}

const saKey = JSON.parse(saKeyJson);

// Initialize admin SDK with explicit credentials
const adminApp = initializeApp(
  {
    projectId: saKey.project_id,
  },
  `linus-admin-${Date.now()}`
);

const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);
const adminSecrets = new SecretManagerServiceClient({
  credentials: saKey,
});
```

### For CLI Operations

When Linus needs to execute `gcloud` or `firebase` commands, he:

1. **Sets the environment variable:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

2. **Runs gcloud/firebase commands:**
   ```bash
   gcloud scheduler jobs create http my-job \
     --location=us-central1 \
     --message-body='{}' \
     --time-zone=UTC \
     --schedule='0 3 * * *'
   ```

**In Next.js/Node.js context:**
```typescript
import { exec } from 'child_process';

const saKey = JSON.parse(process.env.LINUS_SERVICE_ACCOUNT_KEY);
const keyPath = `/tmp/linus-sa-key-${Date.now()}.json`;

// Write key temporarily
fs.writeFileSync(keyPath, JSON.stringify(saKey));

// Set env var and execute gcloud command
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
const result = await exec('gcloud scheduler jobs list --project=studio-567050101-bc6e8');

// Clean up
fs.unlinkSync(keyPath);
```

---

## Security Notes

### ✅ What's Secure
- Service account key is stored in **Google Secret Manager** (encrypted at rest)
- Key is NOT hardcoded in `apphosting.yaml` or source code
- Key is injected as environment variable at runtime only
- Key is never logged or exposed in error messages
- Firebase App Hosting has explicit IAM binding to access the secret

### ⚠️ Key Rotation
The current key (`e60c16d56d3d683a9d606f380a327eb4511dd532`) was created on **2026-02-21 04:32:37 UTC** and set to expire on **9999-12-31** (no automatic rotation).

**To rotate the key:**
```bash
# 1. Create a new key
gcloud iam service-accounts keys create /tmp/new-key.json \
  --iam-account=claude-scheduler-admin@studio-567050101-bc6e8.iam.gserviceaccount.com

# 2. Create a new secret version
gcloud secrets versions add LINUS_SERVICE_ACCOUNT_KEY \
  --data-file=/tmp/new-key.json

# 3. Update apphosting.yaml to use @2
# 4. Disable the old key
gcloud iam service-accounts keys delete <OLD_KEY_ID> \
  --iam-account=claude-scheduler-admin@studio-567050101-bc6e8.iam.gserviceaccount.com

# 5. Deploy
git push origin main
```

---

## Reference

| Component | Location | Status |
|-----------|----------|--------|
| Service Account | `studio-567050101-bc6e8` | ✅ Active |
| Service Account Key | Secret Manager | ✅ @1 Active |
| Firebase IAM Binding | `bakedbot-prod` backend | ✅ Configured |
| apphosting.yaml | Repository | ✅ Updated |
| ADC (Claude Code) | Local machine | ✅ Configured |

---

## Testing

### Test Claude Code (Local)
```powershell
gcloud secrets list --project=studio-567050101-bc6e8 --limit=5
firebase projects:list
```

### Test Linus (Backend)
Deploy with `git push origin main` and Linus will have access to:
- Create/modify Cloud Scheduler jobs
- Manage secrets in Secret Manager
- Modify IAM policies
- Git operations (via Cloud Source Repositories)
- All other infrastructure operations

---

**Last Updated:** 2026-02-21
**Created By:** Claude Code (Autonomous Setup)
