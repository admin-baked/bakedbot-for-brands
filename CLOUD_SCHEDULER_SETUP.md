# Cloud Scheduler Setup for Welcome Jobs

**Purpose**: Automatically process Mrs. Parker's welcome email/SMS jobs every minute

---

## Overview

When a lead is captured via the age gate, two jobs are created in the `/jobs` collection:
1. `send_welcome_email` - Mrs. Parker sends a personalized welcome email
2. `send_welcome_sms` - Mrs. Parker sends a personalized welcome SMS

These jobs need to be processed by calling `/api/jobs/welcome` regularly.

---

## Setup Instructions

### 1. Enable Required APIs

```bash
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudtasks.googleapis.com
```

### 2. Create Cloud Scheduler Job

**Via Google Cloud Console:**

1. Go to [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)
2. Click "Create Job"
3. Configure:
   - **Name**: `process-welcome-jobs`
   - **Description**: Process Mrs. Parker welcome email/SMS jobs
   - **Frequency**: `* * * * *` (every minute)
   - **Timezone**: `America/Chicago` (or your preferred timezone)
   - **Target**: HTTP
   - **URL**: `https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/jobs/welcome`
   - **HTTP Method**: POST
   - **Auth header**: Service account
   - **Service Account**: Create or use existing with appropriate permissions

**Via gcloud CLI:**

```bash
gcloud scheduler jobs create http process-welcome-jobs \
  --schedule="* * * * *" \
  --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/jobs/welcome" \
  --http-method=POST \
  --location=us-central1 \
  --attempt-deadline=120s \
  --time-zone="America/Chicago" \
  --description="Process Mrs. Parker welcome email/SMS jobs"
```

### 3. Set Up Service Account Permissions

The Cloud Scheduler service account needs permission to invoke the endpoint:

```bash
# Get the service account email
SERVICE_ACCOUNT=$(gcloud scheduler jobs describe process-welcome-jobs \
  --location=us-central1 \
  --format='value(httpTarget.oidcToken.serviceAccountEmail)')

# Grant invoker role (if using Cloud Run)
gcloud run services add-iam-policy-binding bakedbot-prod \
  --member=serviceAccount:${SERVICE_ACCOUNT} \
  --role=roles/run.invoker \
  --region=us-central1
```

---

## Testing

### Manual Trigger

Test the scheduler job manually:

```bash
gcloud scheduler jobs run process-welcome-jobs --location=us-central1
```

### Check Logs

View execution logs:

```bash
gcloud logging read "resource.type=cloud_scheduler_job AND resource.labels.job_id=process-welcome-jobs" \
  --limit=50 \
  --format="table(timestamp, severity, textPayload)"
```

### Verify Job Processing

1. Capture a test lead via age gate: `https://bakedbot.ai/demo-shop`
2. Check Firestore `/jobs` collection for pending jobs
3. Wait 1 minute for scheduler to run
4. Verify jobs are marked as `completed`
5. Check Mailjet/Blackleaf for sent messages
6. Verify lead has `welcomeEmailSent: true` and/or `welcomeSmsSent: true`

---

## Alternative: Immediate Execution (Fire-and-Forget)

Instead of waiting for Cloud Scheduler, trigger welcome jobs immediately after lead capture:

### Update `email-capture.ts`

```typescript
// After creating the job, immediately trigger processing
await fetch('https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/jobs/welcome', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        jobId: leadId, // Optional: process specific job
    }),
});
```

**Benefits**:
- Instant welcome messages (no 1-minute delay)
- Better user experience
- Reduces job queue backlog

**Drawbacks**:
- Fire-and-forget (no retry if fails)
- Less control over rate limiting

---

## Monitoring

### View Job Queue

Check pending jobs in Firestore:

```javascript
// In Firebase Console
db.collection('jobs')
  .where('agent', '==', 'mrs_parker')
  .where('status', '==', 'pending')
  .get()
```

### Dashboard

View leads and welcome status in CEO Dashboard:
- **URL**: `https://bakedbot.ai/dashboard/ceo?tab=leads`
- **Metrics**: Total leads, email/SMS opt-ins, welcome sent status

---

## Frequency Options

| Schedule | Cron Expression | Use Case |
|----------|----------------|----------|
| Every minute | `* * * * *` | Real-time processing (recommended) |
| Every 5 minutes | `*/5 * * * *` | Lower cost, acceptable delay |
| Every 15 minutes | `*/15 * * * *` | Batch processing |
| Hourly | `0 * * * *` | Low-priority jobs |

**Recommendation**: Start with **every minute** for the best customer experience.

---

## Cost Estimation

Cloud Scheduler pricing (as of 2025):
- **First 3 jobs**: Free
- **Additional jobs**: $0.10 per job per month
- **HTTP invocations**: Included

**Example**: Running 1 job every minute = ~43,800 invocations/month = **$0.10/month**

Cloud Run invocations (Firebase App Hosting):
- Included in Firebase pricing
- No additional cost for scheduled jobs

**Total estimated cost**: **$0.10/month**

---

## Troubleshooting

### Job Not Running

1. **Check scheduler status**:
   ```bash
   gcloud scheduler jobs describe process-welcome-jobs --location=us-central1
   ```

2. **Verify service account permissions**:
   ```bash
   gcloud run services get-iam-policy bakedbot-prod --region=us-central1
   ```

3. **Check execution history**:
   ```bash
   gcloud scheduler jobs list --location=us-central1
   ```

### Jobs Stuck in "Pending"

1. Check API endpoint is accessible: `curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/jobs/welcome`
2. Verify Letta API key is set in environment
3. Check Mailjet/Blackleaf API keys
4. Review server logs for errors

### High Failure Rate

1. **Increase timeout**: Default is 60s, increase to 120s for slower email sends
2. **Add retry logic**: Cloud Scheduler will retry failed jobs automatically
3. **Check rate limits**: Mailjet/Blackleaf may have rate limits

---

## Future Enhancements

### Batch Processing

Process multiple jobs in a single execution:

```typescript
// In /api/jobs/welcome
const BATCH_SIZE = 10; // Process 10 jobs per run
const pendingJobs = await db
    .collection('jobs')
    .where('status', '==', 'pending')
    .limit(BATCH_SIZE)
    .get();
```

### Priority Queue

Process high-priority welcome jobs first:

```typescript
const pendingJobs = await db
    .collection('jobs')
    .where('status', '==', 'pending')
    .orderBy('priority', 'desc') // 'high' before 'normal'
    .orderBy('createdAt', 'asc')
    .limit(10)
    .get();
```

### Dead Letter Queue

Move failed jobs after 3 attempts:

```typescript
if (job.attempts >= 3) {
    await db.collection('jobs_failed').doc(jobId).set({
        ...job,
        failedAt: Date.now(),
        reason: 'Max attempts reached',
    });

    await db.collection('jobs').doc(jobId).delete();
}
```

---

## Production Checklist

- [ ] Cloud Scheduler job created and running every minute
- [ ] Service account has `run.invoker` permissions
- [ ] Letta API key added to production secrets
- [ ] Mailjet API key configured
- [ ] Blackleaf API key configured
- [ ] Test lead captured and processed successfully
- [ ] Welcome email received in test inbox
- [ ] Welcome SMS received on test phone
- [ ] CEO Dashboard leads tab accessible
- [ ] Monitoring alerts set up (optional)

---

## Contact

For issues or questions:
- Check Firebase logs: [Firebase Console](https://console.firebase.google.com)
- Review Cloud Scheduler logs: [Cloud Console](https://console.cloud.google.com/cloudscheduler)
- View CEO Dashboard leads: `https://bakedbot.ai/dashboard/ceo?tab=leads`

---

**Status**: ✅ Ready for Production Deployment

**Next Step**: Run `gcloud scheduler jobs create http ...` command above to activate automated welcome messages.
