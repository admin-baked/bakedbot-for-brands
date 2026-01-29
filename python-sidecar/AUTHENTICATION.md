# NotebookLM Authentication Guide

The NotebookLM MCP integration requires Google authentication to access NotebookLM. Here are all available authentication methods, from easiest to most advanced.

---

## 🎯 Quick Comparison

| Method | Difficulty | Speed | Reliability | Best For |
|--------|-----------|-------|-------------|----------|
| **Cookie Export** | Easy | 5 min | ⭐⭐⭐⭐⭐ | Production, automated |
| **OAuth Code** | Medium | 10 min | ⭐⭐⭐⭐ | First-time setup |
| **Manual GUI** | Hard | 15 min | ⭐⭐⭐ | Troubleshooting |
| **Programmatic** | Expert | Varies | ⭐⭐⭐⭐ | CI/CD, automation |

---

## Method 1: Cookie Export (Recommended ⭐)

**Easiest and most reliable method.** Export cookies from your logged-in Chrome browser.

### Step 1: Export Cookies

1. **Install Cookie Extension**
   - Chrome Web Store → Search "EditThisCookie" or "Cookie-Editor"
   - Click "Add to Chrome"

2. **Login to NotebookLM**
   - Go to https://notebooklm.google.com
   - Make sure you're fully logged in
   - Open your notebook to verify access

3. **Export Cookies**
   - Click the cookie extension icon
   - **EditThisCookie**: Click "Export" → Copy to clipboard
   - **Cookie-Editor**: Click "Export" → Select JSON format
   - Save as `cookies.json` in `python-sidecar/` folder

### Step 2: Import to VM

```powershell
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands\python-sidecar"
.\auth-via-cookies.ps1
```

This script will:
- Upload cookies.json to VM
- Import into Chrome profile
- Restart service
- Test authentication

### Expected Result
```
✅ Found cookies.json
✅ Valid JSON format (45 cookies)
✅ Successfully imported 12 Google cookies
✅ Authentication successful!
```

---

## Method 2: OAuth Authorization Code

**Use if you have an OAuth code from Google.** You provided one earlier in the session.

### If You Have an OAuth Code

```powershell
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands\python-sidecar"

# SSH to VM
gcloud compute ssh notebooklm-vm --zone=us-central1-a

# On VM:
cd /opt/bakedbot-sidecar
source venv/bin/activate
sudo systemctl stop bakedbot-sidecar

# Run init with your OAuth code
notebooklm-mcp auth <YOUR_OAUTH_CODE>

# Restart
sudo systemctl start bakedbot-sidecar
exit
```

### To Get a New OAuth Code

```powershell
# On VM
notebooklm-mcp init https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c
```

This will:
1. Print a URL
2. You open it in browser
3. Grant permissions
4. Copy the code shown
5. Use the code as shown above

---

## Method 3: Remote CLI Authentication

**Attempts to run authentication remotely**, but may require manual intervention.

```powershell
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands\python-sidecar"
.\auth-remote.ps1
```

This script:
- Stops the service
- Runs `notebooklm-mcp init` command
- Attempts automated authentication
- Restarts service

**Note**: May not work fully automated due to OAuth requirements.

---

## Method 4: Manual GUI Access (Fallback)

**For troubleshooting when other methods fail.**

### Via Google Cloud Console

1. **Access VM Console**
   - Go to: https://console.cloud.google.com/compute/instances
   - Click `notebooklm-vm`
   - Click "Connect" → "SSH-in-browser"

2. **Stop Service & Enable GUI**
   ```bash
   sudo systemctl stop bakedbot-sidecar
   cd /opt/bakedbot-sidecar

   # Set headless=false
   python3 -c "import json; f=open('notebooklm-config.json','r'); d=json.load(f); d['headless']=False; json.dump(open('notebooklm-config.json','w'), d, indent=2)"
   ```

3. **Run Init with Display**
   ```bash
   export DISPLAY=:99
   Xvfb :99 -screen 0 1280x1024x24 &
   source venv/bin/activate
   notebooklm-mcp init https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c
   ```

4. **Follow OAuth Flow**
   - Click the URL shown
   - Login to Google
   - Grant permissions
   - Wait for success message

5. **Restore Headless & Restart**
   ```bash
   python3 -c "import json; f=open('notebooklm-config.json','r'); d=json.load(f); d['headless']=True; json.dump(open('notebooklm-config.json','w'), d, indent=2)"
   sudo systemctl start bakedbot-sidecar
   ```

---

## Method 5: Programmatic API-Based (Advanced)

**For automated environments, CI/CD, or multiple VMs.**

### Option A: Service Account (If Supported)

```typescript
// Not currently supported by NotebookLM, but pattern for reference
const auth = await authenticateWithServiceAccount({
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
});
```

### Option B: Headless OAuth Flow

```typescript
// Using puppeteer or selenium for automated OAuth
import puppeteer from 'puppeteer';

async function authenticateHeadless() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to OAuth URL
  await page.goto(oauthUrl);

  // Fill credentials (from secure vault)
  await page.type('#email', process.env.GOOGLE_EMAIL);
  await page.type('#password', process.env.GOOGLE_PASSWORD);

  // Handle 2FA if needed
  // Extract cookies
  const cookies = await page.cookies();

  // Import to Chrome profile
  await importCookiesToVM(cookies);
}
```

### Option C: Cookie Refresh Service

```typescript
// Periodically refresh cookies before expiration
import { scheduleCookieRefresh } from './auth-service';

scheduleCookieRefresh({
  interval: '24h',
  onExpiry: async () => {
    await exportFreshCookies();
    await importToVM();
    await restartService();
  }
});
```

---

## Verification

After any authentication method, verify it worked:

```powershell
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands\python-sidecar"
.\test-chat.ps1
```

**Success Indicators:**
- `authenticated: true`
- Response contains actual content
- No "Not authenticated" error

**Failure Indicators:**
- `authenticated: false`
- "Not authenticated or browser not ready"
- "Chat interaction failed"

---

## Troubleshooting

### "Not authenticated" after cookie import

**Problem**: Cookies expired or wrong domain

**Solution**:
```powershell
# 1. Check cookie file
Get-Content cookies.json | ConvertFrom-Json | Where-Object { $_.domain -like '*google*' }

# 2. Export fresh cookies (stay logged in!)
# 3. Try again
.\auth-via-cookies.ps1
```

### "Session not found" error

**Problem**: Service started before MCP server ready

**Solution**:
```powershell
# Restart service
gcloud compute ssh notebooklm-vm --zone=us-central1-a `
  --command="sudo systemctl restart bakedbot-sidecar"

# Wait 10 seconds
Start-Sleep -Seconds 10

# Test again
.\test-chat.ps1
```

### Chrome crashes during init

**Problem**: Memory or Chrome version issue

**Solution**:
```bash
# On VM
sudo systemctl stop bakedbot-sidecar
google-chrome-beta --version  # Should be 145.x
killall chrome  # Kill any stuck processes
sudo systemctl start bakedbot-sidecar
```

### Cookies database locked

**Problem**: Service running while importing cookies

**Solution**:
```powershell
# Always stop service before cookie import
gcloud compute ssh notebooklm-vm --zone=us-central1-a `
  --command="sudo systemctl stop bakedbot-sidecar"

# Then import
.\auth-via-cookies.ps1
```

---

## Security Best Practices

### ✅ Do:
- Use cookie export method (most secure)
- Store OAuth codes in environment variables
- Rotate cookies periodically
- Use separate Google account for automation
- Enable 2FA on your Google account

### ❌ Don't:
- Commit cookies.json to git
- Share OAuth codes publicly
- Use your personal Google account
- Store credentials in plain text
- Leave authenticated sessions unmonitored

---

## Cookie Expiration

Google cookies typically expire in:
- **Session cookies**: Browser close (not applicable here)
- **OAuth tokens**: 1-7 days
- **Remember me cookies**: 30-90 days

**Recommendation**: Set up automated cookie refresh every 30 days.

---

## Automated Cookie Refresh (Production)

```typescript
// src/server/jobs/refresh-notebooklm-auth.ts

import { CronJob } from 'cron';
import { exec } from 'child_process';

// Run every 30 days at 2 AM
export const authRefreshJob = new CronJob('0 2 1 * *', async () => {
  console.log('[NotebookLM] Refreshing authentication...');

  try {
    // Export fresh cookies from your logged-in browser
    // (You'll need to build a system to automate this)
    const cookies = await exportCookiesFromBrowser();

    // Import to VM
    await exec('cd python-sidecar && .\\auth-via-cookies.ps1');

    console.log('[NotebookLM] Authentication refreshed successfully');
  } catch (error) {
    console.error('[NotebookLM] Auth refresh failed:', error);
    // Send alert
    await sendAlert('NotebookLM auth needs manual refresh');
  }
});
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Export cookies | Use EditThisCookie extension |
| Import cookies | `.\auth-via-cookies.ps1` |
| Test auth | `.\test-chat.ps1` |
| Check status | `.\diagnose.ps1` |
| View logs | `gcloud compute ssh notebooklm-vm --zone=us-central1-a --command='sudo journalctl -u bakedbot-sidecar -n 50'` |

---

## Next Steps

1. ✅ Choose authentication method (Cookie Export recommended)
2. ✅ Follow the steps above
3. ✅ Run `.\test-chat.ps1` to verify
4. ✅ Start using NotebookLM in your agents!

Once authenticated, the integration is fully operational and ready for production use! 🚀
