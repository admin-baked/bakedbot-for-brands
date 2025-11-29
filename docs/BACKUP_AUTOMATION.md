# Firestore Backup & Disaster Recovery

## Overview

Automated backup and restore system for Firestore data using Google Cloud Platform.

## Quick Start

```bash
# Create backup now
npm run backup:firestore

# Create and verify backup
npm run backup:firestore -- --verify

# List available backups
gsutil ls gs://bakedbot-for-brands-backups

# Restore from specific date
npm run backup:restore -- --date=2024-01-15
```

## Setup Requirements

### 1. Google Cloud SDK

Install the Google Cloud SDK:
```bash
# macOS/Linux
curl https://sdk.cloud.google.com | bash

# Windows
# Download from: https://cloud.google.com/sdk/docs/install
```

### 2. Authentication

```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project bakedbot-for-brands

# Verify authentication
gcloud auth list
```

### 3. Create Backup Bucket

```bash
# Create GCS bucket for backups
gsutil mb -l us-central1 gs://bakedbot-for-brands-backups

# Set lifecycle rule for auto-deletion after 30 days
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://bakedbot-for-brands-backups
```

### 4. Grant Permissions

Ensure the service account has these IAM roles:
- `roles/datastore.importExportAdmin` - Firestore import/export
- `roles/storage.admin` - GCS bucket access

```bash
# Grant permissions (replace SERVICE_ACCOUNT with your actual service account)
gcloud projects add-iam-policy-binding bakedbot-for-brands \
    --member="serviceAccount:SERVICE_ACCOUNT@bakedbot-for-brands.iam.gserviceaccount.com" \
    --role="roles/datastore.importExportAdmin"

gcloud projects add-iam-policy-binding bakedbot-for-brands \
    --member="serviceAccount:SERVICE_ACCOUNT@bakedbot-for-brands.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

## Automated Backups

### Option 1: Cloud Scheduler (Recommended)

Set up daily automated backups using Cloud Scheduler:

```bash
# Enable Cloud Scheduler API
gcloud services enable cloudscheduler.googleapis.com

# Create daily backup job (runs at 2 AM UTC)
gcloud scheduler jobs create app-engine backup-firestore-daily \
    --schedule="0 2 * * *" \
    --time-zone="America/Chicago" \
    --uri="https://bakedbot-for-brands.web.app/api/backup" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"action":"backup","verify":true}' \
    --attempt-deadline=30m

# Verify job created
gcloud scheduler jobs list
```

### Option 2: GitHub Actions

Add to `.github/workflows/backup.yml`:

```yaml
name: Firestore Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: bakedbot-for-brands
      
      - name: Run Backup
        run: |
          npm install
          npm run backup:firestore -- --verify
```

### Option 3: Cron Job (Linux/macOS)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/bakedbot-for-brands && npm run backup:firestore -- --verify >> /var/log/firestore-backup.log 2>&1
```

## Backup Strategy

### Full Backups

- **Frequency:** Daily at 2 AM
- **Retention:** 30 days
- **Location:** `gs://bakedbot-for-brands-backups/firestore-YYYY-MM-DD/`

### What's Backed Up

- All Firestore collections
- Document data
- Subcollections
- Metadata (timestamps, etc.)

### What's NOT Backed Up

- Firebase Auth users (use separate export)
- Cloud Storage files (use separate GCS backups)
- Real-time Database (if used)

## Restore Procedures

### Full Database Restore

```bash
# 1. List available backups
npm run backup:firestore -- --restore

# 2. Restore from specific date
npm run backup:restore -- --date=2024-01-15

# 3. Verify data after restore
# Check key collections in Firebase Console
```

### Partial Restore (Specific Collections)

```bash
# Export specific collections during backup
BACKUP_COLLECTIONS="users,orders,products" npm run backup:firestore

# Restore will import only those collections
npm run backup:restore -- --date=2024-01-15
```

### Testing Restores

**CRITICAL:** Always test restores in a non-production environment first!

```bash
# 1. Create test Firebase project
gcloud config set project bakedbot-test

# 2. Restore to test project
gcloud firestore import gs://bakedbot-for-brands-backups/firestore-2024-01-15 \
    --project=bakedbot-test

# 3. Verify data integrity
# 4. Document any issues
```

## Monitoring & Alerts

### Backup Success Verification

Create a Cloud Function to verify backups:

```javascript
// functions/verify-backup.js
export async function verifyBackup(date) {
  const backupPath = `gs://bakedbot-for-brands-backups/firestore-${date}`;
  
  // Check if backup exists
  const [exists] = await bucket.file(backupPath).exists();
  
  if (!exists) {
    // Send alert via email/Slack
    await sendAlert(`Backup verification failed for ${date}`);
    return false;
  }
  
  return true;
}
```

### Set Up Alerts

Configure alerts for:
- Backup failures
- Missing daily backups
- GCS storage quota warnings

```bash
# Example: Alert if backup hasn't run in 25 hours
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Firestore Backup Missing" \
    --condition-display-name="No backup in 25 hours" \
    --condition-threshold-value=0 \
    --condition-threshold-duration=25h \
    --aggregation-alignment-period=60s
```

## Disaster Recovery Plan

### Recovery Time Objective (RTO)

- **Target:** < 2 hours
- **Prerequisites:** Access to GCP, backup verification complete
- **Steps:** See "Full Database Restore" above

### Recovery Point Objective (RPO)

- **Target:** < 24 hours
- **Maximum data loss:** 1 day (daily backups)
- **Consideration:** For critical applications, consider more frequent backups

### Recovery Checklist

1. ✅ Identify incident and scope of data loss
2. ✅ Determine restore point (date/time)
3. ✅ Verify backup exists and is accessible
4. ✅ Create test environment and test restore
5. ✅ Notify stakeholders of downtime window
6. ✅ Put application in maintenance mode
7. ✅ Execute restore to production
8. ✅ Verify data integrity
9. ✅ Resume application operations
10. ✅ Document incident and lessons learned

## Cost Optimization

### Storage Costs

- **GCS Standard Storage:** ~$0.02 per GB/month
- **Expected:** ~10-50 GB (varies by usage)
- **Monthly cost:** ~$0.20 - $1.00

### Optimization Tips

1. Set retention policy (30 days recommended)
2. Use lifecycle rules for auto-deletion
3. Consider Nearline storage for older backups (cheaper)
4. Monitor backup size trends

## Troubleshooting

### Error: "Permission Denied"

**Solution:** Grant service account proper IAM roles (see Setup step 4)

### Error: "Bucket does not exist"

**Solution:** Create backup bucket (see Setup step 3)

### Error: "gcloud command not found"

**Solution:** Install Google Cloud SDK (see Setup step 1)

### Backup Taking Too Long

**Solutions:**
- Backup specific collections only
- Schedule during off-peak hours
- Increase timeout in Cloud Scheduler

## Security Best Practices

1. **Encrypt backups:** GCS encrypts at rest by default
2. **Access control:** Limit who can restore backups
3. **Audit logging:** Enable GCS access logs
4. **Test restores:** Quarterly restore tests mandatory
5. **Offsite copies:** Consider multi-region backups for critical data

## Additional Resources

- [Firestore Export/Import Documentation](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [GCS Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Cloud Scheduler Documentation](https://cloud.google.com/scheduler/docs)
- [Disaster Recovery Planning Guide](https://cloud.google.com/architecture/dr-scenarios-planning-guide)
