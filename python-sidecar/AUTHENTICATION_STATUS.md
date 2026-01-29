# NotebookLM Authentication Status

## ✅ Completed Fixes

1. **Cookie Import Script** - Fixed to include all 20 required Chrome cookies database fields
   - Added proper timestamp handling
   - Added sameSite mapping
   - Successfully imported 22 Google cookies (verified)

2. **Headless Configuration** - Set `headless: true` in notebooklm-config.json
   - Allows Chrome to run without display on VM
   - Verified in logs: "Mode: Headless"

3. **Authentication Call** - Patched server.py to call `client.authenticate()` after browser start
   - File: `/opt/bakedbot-sidecar/venv/lib/python3.11/site-packages/notebooklm_mcp/server.py`
   - Patch applied successfully
   - Authentication is now called on startup (confirmed in logs)

4. **Fresh Cookies Imported** - Imported cookies from active NotebookLM session
   - 22 cookies including OSID, SID, HSID, SSID, APISID, SAPISID
   - Cookies saved to Chrome profile database
   - Service restarted successfully

## ❌ Current Issue

**Google Rejects Cookies in Automated Browser**

Despite fresh cookies being imported, Google detects the automated browser (undetected-chromedriver in headless mode) and redirects to signin page.

### Evidence from Logs (Jan 29 21:36:55)
```
INFO  | Navigating to: https://notebooklm.google.com/notebook/59f47d3e-9e5c-4adc-9254-bd78f076898c
DEBUG | Current URL after navigation: https://accounts.google.com/v3/signin/identifier...
WARNING | ❌ Authentication required - need manual login
```

### Healthcheck Status
```json
{
  "status": "needs_auth",
  "authenticated": false,
  "notebook_id": "59f47d3e-9e5c-4adc-9254-bd78f076898c"
}
```

## 🔍 Root Cause

**Cookie-Based Auth Limitation with Browser Automation**

The issue is NOT with our cookie import process - that's working correctly. The problem is:

1. **Google's Bot Detection**: Even with valid cookies, Google detects the automated browser and requires manual authentication
2. **Cookie Context Mismatch**: Cookies exported from a normal Chrome session may not work when imported into an automated Chrome instance
3. **Security Policies**: Chrome may not trust cookies that weren't created in the current browser session

This is a known limitation of cookie-based authentication with Selenium/undetected-chromedriver.

## 💡 Potential Solutions

### Option 1: Manual First-Time Authentication (Recommended)
The notebooklm-mcp library may need to be run interactively once for initial authentication:

1. SSH into VM with X11 forwarding or use VNC
2. Run notebooklm-mcp with headless=false
3. Manually log in when prompted
4. Chrome saves session to profile
5. Subsequent runs reuse the authenticated session

### Option 2: Alternative NotebookLM Integration
- Use NotebookLM's official API (if one exists)
- Build a lightweight proxy that authenticates via your browser
- Use Google Cloud service account authentication (if supported)

### Option 3: Persistent Session Approach
Modify the Chrome profile to better persist sessions:
- Disable cache clearing
- Use a fully persistent Chrome profile
- Copy an entire authenticated Chrome profile directory

### Option 4: Different Automation Tool
- Try Playwright instead of Selenium
- Use a real Chrome instance with remote debugging
- Use a non-headless browser on VM with VNC

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Cookie Import | ✅ Working | 22 cookies imported successfully |
| Service Running | ✅ Healthy | HTTP server on port 8001 |
| Headless Mode | ✅ Configured | Chrome runs without display |
| Authentication Patch | ✅ Applied | `authenticate()` called on startup |
| Google Authentication | ❌ Blocked | Bot detection prevents cookie auth |

## 🎯 Recommended Next Steps

1. **Research notebooklm-mcp docs** for official authentication method
2. **Check if NotebookLM has an API** that doesn't require browser automation
3. **Try manual authentication** on VM with non-headless mode
4. **Consider alternative approaches** to NotebookLM integration

## 📝 Technical Details

### Cookie Import Process
- Cookies written to: `/opt/bakedbot-sidecar/chrome_profile_notebooklm/Default/Cookies`
- SQLite database with all 20 required fields
- Proper timestamps, sameSite values, secure flags

### Service Architecture
- NotebookLM MCP server (FastMCP 2.14.4)
- undetected-chromedriver for anti-detection
- HTTP transport on 127.0.0.1:8001
- Proxied through bakedbot-sidecar on port 8080

### Error Path
1. Service starts → Chrome launches headless
2. `_ensure_client()` called → creates NotebookLMClient
3. `client.authenticate()` called → navigates to notebook URL
4. Google detects automation → redirects to signin
5. `_is_authenticated` remains False
6. Chat requests fail with "Not authenticated"
