# Fix FIREBASE_SERVICE_ACCOUNT_KEY Secret

## Problem
Server logs show: `FIREBASE_SERVICE_ACCOUNT_KEY is not a valid Base64-encoded JSON string`

This means the secret in Google Cloud Secret Manager contains raw JSON instead of Base64-encoded JSON.

## Solution

### Step 1: Copy the Base64 String
The correct Base64-encoded value has been generated. Run this command to get it:

```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content service-account.json -Raw)))
```

Or copy from the file `sa.b64` (if it exists).

### Step 2: Update the Secret in Google Cloud

1. Go to **[Secret Manager](https://console.cloud.google.com/security/secret-manager?project=studio-567050101-bc6e8)**
2. Find `FIREBASE_SERVICE_ACCOUNT_KEY`
3. Click **+ New Version**
4. Paste the Base64 string (the long string starting with `ew0KIC...`)
5. Click **Add New Version**

### Step 3: Trigger New Deployment

The deployment will automatically pick up the new secret version. You can either:

**Option A: Push a commit**
```bash
git commit --allow-empty -m "chore: trigger deployment after secret fix"
git push origin main
```

**Option B: Manual rollout in Firebase Console**
Go to [App Hosting Console](https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting) and click "Deploy" on your backend.

### Step 4: Verify

After deployment (2-3 minutes):
1. Go to your app: `https://bakedbot-for-brands--studio-567050101-bc6e8.us-east4.hosted.app/`
2. Try to login with `martez@bakedbot.ai`
3. Session should be created successfully

### Step 5: Check Logs (if still failing)

If you still see errors, check the logs:
```
https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8
```

Search for: `"Session creation error"`

## Why This Happened

The secret likely contained the raw JSON content of `service-account.json` instead of the Base64-encoded version. The application expects Base64 encoding for security and to avoid newline/formatting issues in environment variables.

## Prevention

Always use this command to generate the secret value:
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content service-account.json -Raw)))
```

Or use the gcloud command:
```bash
cat service-account.json | base64
```
