# Check cookies using Python
$VM_NAME = "notebooklm-vm"
$ZONE = "us-central1-a"

Write-Host "=== Checking Chrome Cookies ===" -ForegroundColor Cyan

$pythonScript = @'
import sqlite3
from pathlib import Path

db_path = Path('/opt/bakedbot-sidecar/chrome_profile_notebooklm/Default/Cookies')

if not db_path.exists():
    print(f"Cookies DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Count Google cookies
cursor.execute("SELECT COUNT(*) FROM cookies WHERE host_key LIKE '%google%'")
count = cursor.fetchone()[0]
print(f"Google cookies count: {count}")

# Show sample cookies
print("\nSample Google cookies:")
cursor.execute("SELECT host_key, name, is_secure, is_httponly FROM cookies WHERE host_key LIKE '%google%' LIMIT 10")
for row in cursor.fetchall():
    print(f"  {row[0]} | {row[1]} | secure={row[2]} | httponly={row[3]}")

conn.close()
'@

$pythonScript | Out-File -FilePath "check_cookies.py" -Encoding ASCII

gcloud compute scp check_cookies.py ${VM_NAME}:/tmp/check_cookies.py --zone=$ZONE
gcloud compute ssh $VM_NAME --zone=$ZONE --command="cd /opt/bakedbot-sidecar && python3 /tmp/check_cookies.py"

Remove-Item check_cookies.py
