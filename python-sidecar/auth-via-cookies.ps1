# Authenticate via Cookie Export (Most Reliable)

$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Cookie-Based Authentication ===" -ForegroundColor Cyan

Write-Host @"

This method exports cookies from YOUR logged-in Chrome browser
and transfers them to the VM. This is the most reliable method.

Prerequisites:
1. You must be logged into NotebookLM in Chrome on this computer
2. Install a cookie export extension (EditThisCookie or Cookie Editor)

Steps:
1. Open Chrome and go to https://notebooklm.google.com
2. Make sure you're logged in
3. Install EditThisCookie extension (chrome.google.com/webstore)
4. Click the extension icon → Export → Copy to clipboard
5. Save to a file named 'cookies.json' in the python-sidecar directory

"@ -ForegroundColor Yellow

Write-Host "Checking for cookies.json..." -ForegroundColor Yellow

$cookiesFile = "cookies.json"
if (-not (Test-Path $cookiesFile)) {
    Write-Host "`n❌ cookies.json not found" -ForegroundColor Red
    Write-Host @"

Please create cookies.json with exported cookies from Chrome:

1. Go to https://notebooklm.google.com in Chrome
2. Install EditThisCookie extension
3. Click extension → Export
4. Save as cookies.json in python-sidecar folder
5. Run this script again

Alternative: Use Cookie-Editor extension and export as JSON format

"@ -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Found cookies.json" -ForegroundColor Green

# Validate JSON
try {
    $cookies = Get-Content $cookiesFile -Raw | ConvertFrom-Json
    Write-Host "✅ Valid JSON format ($($cookies.Count) cookies)" -ForegroundColor Green
} catch {
    Write-Host "❌ Invalid JSON format" -ForegroundColor Red
    exit 1
}

# Create Python script to import cookies
$importScript = @'
import json
import sqlite3
import sys
import time
from pathlib import Path

# Read cookies JSON
with open('cookies.json', 'r') as f:
    cookies = json.load(f)

# Path to Chrome cookies DB
cookies_db = Path('/opt/bakedbot-sidecar/chrome_profile_notebooklm/Default/Cookies')

if not cookies_db.exists():
    print(f"Error: Cookies database not found at {cookies_db}")
    sys.exit(1)

# Connect to SQLite database
conn = sqlite3.connect(str(cookies_db))
cursor = conn.cursor()

# Check table structure
cursor.execute("PRAGMA table_info(cookies)")
columns = [row[1] for row in cursor.fetchall()]
print(f"Cookie table columns: {columns}")

imported = 0
current_time = int(time.time() * 1000000)  # Chrome uses microseconds since epoch

for cookie in cookies:
    try:
        # Extract cookie fields (adjust based on your export format)
        host = cookie.get('domain', cookie.get('host', ''))
        name = cookie.get('name', '')
        value = cookie.get('value', '')
        path = cookie.get('path', '/')
        expires = cookie.get('expirationDate', 0)
        secure = 1 if cookie.get('secure', False) else 0
        httponly = 1 if cookie.get('httpOnly', False) else 0

        # Map sameSite values
        samesite_map = {
            'unspecified': 0,
            'no_restriction': 0,
            'lax': 1,
            'strict': 2
        }
        samesite_value = samesite_map.get(cookie.get('sameSite', 'unspecified').lower(), 0)

        # Only import Google-related cookies
        if 'google' not in host.lower():
            continue

        # Insert or replace cookie with all required fields
        cursor.execute("""
            INSERT OR REPLACE INTO cookies
            (creation_utc, host_key, top_frame_site_key, name, value, encrypted_value,
             path, expires_utc, is_secure, is_httponly, last_access_utc, has_expires,
             is_persistent, priority, samesite, source_scheme, source_port,
             last_update_utc, source_type, has_cross_site_ancestor)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_time,           # creation_utc
            host,                   # host_key
            '',                     # top_frame_site_key
            name,                   # name
            value,                  # value
            b'',                    # encrypted_value
            path,                   # path
            int(expires * 1000000) if expires > 0 else 0,  # expires_utc
            secure,                 # is_secure
            httponly,               # is_httponly
            current_time,           # last_access_utc
            1 if expires > 0 else 0,  # has_expires
            1 if expires > 0 else 0,  # is_persistent
            1,                      # priority (medium)
            samesite_value,         # samesite
            2 if secure else 0,     # source_scheme (2=secure, 0=unset)
            443 if secure else 80,  # source_port
            current_time,           # last_update_utc
            0,                      # source_type
            0                       # has_cross_site_ancestor
        ))

        imported += 1
    except Exception as e:
        print(f"Warning: Failed to import {name}: {e}")

conn.commit()
conn.close()

print(f"Successfully imported {imported} Google cookies")
'@

# Save import script temporarily
$importScript | Out-File -FilePath "import_cookies.py" -Encoding UTF8

Write-Host "`n[1/4] Copying files to VM..." -ForegroundColor Yellow
gcloud compute scp cookies.json ${VM_NAME}:/tmp/cookies.json --zone=$ZONE
gcloud compute scp import_cookies.py ${VM_NAME}:/tmp/import_cookies.py --zone=$ZONE

Write-Host "`n[2/4] Stopping service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl stop bakedbot-sidecar"

Write-Host "`n[3/4] Importing cookies..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd /opt/bakedbot-sidecar && sudo mv /tmp/cookies.json . && sudo mv /tmp/import_cookies.py . && sudo python3 import_cookies.py && sudo rm cookies.json import_cookies.py"

Write-Host "`n[4/4] Restarting service..." -ForegroundColor Yellow
gcloud compute ssh $VM_NAME --zone=$ZONE --command="sudo systemctl start bakedbot-sidecar && sleep 5"

# Clean up local temp file
Remove-Item "import_cookies.py" -ErrorAction SilentlyContinue

Write-Host "`n=== Testing Authentication ===" -ForegroundColor Cyan
Start-Sleep -Seconds 5

.\test-chat.ps1

Write-Host @"

✅ Cookie import complete!

If authentication is successful, you're done!
If not, try:
1. Make sure you exported ALL cookies from notebooklm.google.com
2. Check that you were logged in when exporting
3. Try exporting again with a different extension

"@ -ForegroundColor Green
