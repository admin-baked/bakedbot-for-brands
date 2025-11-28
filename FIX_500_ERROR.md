# 🚨 Fixing the 500 Internal Server Error

The 500 error on `bakedbot.ai` is likely caused by missing or inaccessible environment variables, specifically the **Firebase Service Account Key**.

## 1. Verify Secrets in Google Cloud

The following secrets MUST exist in [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager):

- `FIREBASE_SERVICE_ACCOUNT_KEY` (Critical)
- `SENDGRID_API_KEY`
- `BLACKLEAF_API_KEY`
- `CANNMENUS_API_KEY`
- `STRIPE_SECRET_KEY` (If using platform payments)

### How to Fix `FIREBASE_SERVICE_ACCOUNT_KEY`:

1.  **Generate Key:**
    - Go to [Firebase Console](https://console.firebase.google.com/) > Project Settings > Service accounts.
    - Click **Generate new private key**.
    - This downloads a JSON file.

2.  **Base64 Encode:**
    - **Mac/Linux:** `cat path/to/key.json | base64`
    - **Windows (PowerShell):**
      ```powershell
      $content = Get-Content "path\to\key.json" -Raw
      [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
      ```

3.  **Update Secret:**
    - Go to Secret Manager.
    - Create/Edit `FIREBASE_SERVICE_ACCOUNT_KEY`.
    - Paste the **Base64 encoded string** as the value.

## 2. Grant Access to App Hosting

Your App Hosting backend needs permission to read these secrets.

1.  Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam).
2.  Find the service account used by App Hosting (usually ends in `@app-hosting-compute.iam.gserviceaccount.com` or similar, check Firebase App Hosting settings).
3.  Grant it the role **Secret Manager Secret Accessor**.

## 3. Redeploy

After updating secrets, a new rollout is usually required for them to take effect.
- Push a small change to GitHub to trigger a redeploy.
  ```bash
  git commit --allow-empty -m "trigger: Redeploy to pick up secrets"
  git push
  ```

## 4. Check Logs

If it still fails:
1.  Go to [Cloud Logging](https://console.cloud.google.com/logs).
2.  Filter by your App Hosting service.
3.  Look for "Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set" or similar.
