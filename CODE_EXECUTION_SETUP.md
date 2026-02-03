# Code Execution Setup Guide

Complete guide for deploying and using the server-side code execution system.

## Overview

The code execution system allows interns to run their code and see automated test results before submitting for Linus review. This provides immediate feedback and helps interns learn faster.

**Architecture:**
- **Cloud Run Service:** Isolated Docker container executing code
- **Next.js API:** `/api/training/execute` - Proxies requests with auth
- **UI Component:** `CodeTester` - Run tests button with results display

---

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Docker** (optional, for local testing)
4. **Firebase Admin SDK** configured

---

## Deployment Steps

### 1. Deploy Cloud Run Service

```powershell
# Navigate to Cloud Run directory
cd cloud-run/code-runner

# Make deploy script executable (on macOS/Linux)
chmod +x deploy.sh

# Deploy to production
bash deploy.sh prod

# Or deploy to staging
bash deploy.sh staging
```

**What happens:**
- Builds Docker image with Node 20 + TypeScript + Jest
- Pushes to Google Container Registry
- Deploys to Cloud Run with:
  - 512MB memory
  - 1 vCPU
  - 30s timeout
  - 100 max instances (prod) / 10 (staging)
  - Auto-scaling to 0 when idle

**Expected output:**
```
🚀 Deploying BakedBot Code Runner to Cloud Run
   Environment: prod
   Project: bakedbot-ai
   Service: bakedbot-code-runner
   Region: us-central1

🔨 Building Docker image...
✅ Deployment complete!

🌐 Service URL: https://bakedbot-code-runner-abc123-uc.a.run.app
```

### 2. Configure Environment Variables

Add the Cloud Run service URL to your `.env` file:

```bash
# .env or .env.local
CODE_RUNNER_URL=https://bakedbot-code-runner-abc123-uc.a.run.app
```

**For production:**
```bash
# apphosting.yaml
env:
  CODE_RUNNER_URL:
    secret: code_runner_url
```

### 3. Test the Service

```powershell
# Test health endpoint
curl https://bakedbot-code-runner-abc123-uc.a.run.app/health

# Expected response:
# {"status":"healthy","timestamp":"2026-02-03T...","version":"1.0.0"}
```

### 4. Test Code Execution

```powershell
# Test with sample code
curl -X POST https://bakedbot-code-runner-abc123-uc.a.run.app/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "export function add(a: number, b: number) { return a + b; }",
    "tests": "import { add } from \"./code\"; test(\"adds\", () => { expect(add(1, 2)).toBe(3); });",
    "language": "typescript",
    "timeout": 10000
  }'
```

**Expected response:**
```json
{
  "success": true,
  "output": "PASS  tests/code.test.ts\n  ✓ adds (2 ms)",
  "testResults": {
    "numPassedTests": 1,
    "numFailedTests": 0,
    "numTotalTests": 1,
    "testResults": [
      {
        "title": "adds",
        "status": "passed",
        "duration": 2
      }
    ]
  },
  "executionTime": 342
}
```

---

## Adding Tests to Challenges

### Update Challenge Definition

Add `testCode` field to challenges that support automated testing:

```typescript
// In src/lib/training/curriculum.ts or weeks-3-4.ts

{
    id: 'week1-ch1',
    title: 'Hello BakedBot',
    // ... existing fields
    testCode: `
import { greetIntern } from './code';

describe('greetIntern', () => {
    test('returns greeting with name', async () => {
        const result = await greetIntern('Alex');
        expect(result.success).toBe(true);
        expect(result.data.message).toContain('Alex');
        expect(result.data.message).toContain('Welcome');
    });

    test('returns proper ActionResult structure', async () => {
        const result = await greetIntern('Test');
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
    });
});
    `,
    runTests: true,
}
```

### Test Code Guidelines

**Good practices:**
- ✅ Test the happy path
- ✅ Test edge cases
- ✅ Test error handling
- ✅ Keep tests simple and focused
- ✅ Use descriptive test names

**Avoid:**
- ❌ Network requests (no external APIs)
- ❌ File system access (beyond /tmp)
- ❌ Long-running operations (>10s)
- ❌ Overly complex mocking

**Example test patterns:**

```typescript
// Pattern 1: Function testing
test('calculates total correctly', () => {
    expect(calculateTotal([10, 20, 30])).toBe(60);
});

// Pattern 2: Server Action testing
test('requires authentication', async () => {
    const result = await myServerAction();
    expect(result.success).toBe(false);
    // Note: requireUser will throw in actual code
});

// Pattern 3: Validation testing
test('validates input with Zod', () => {
    const schema = z.object({ name: z.string() });
    expect(() => schema.parse({ name: 123 })).toThrow();
});
```

---

## Using in UI

### Add CodeTester to Challenge Page

Update the challenge detail page to include code testing:

```typescript
// In src/app/dashboard/training/challenge/[id]/page-client.tsx

import { CodeTester } from '../../components/code-tester';

// In the Submit tab content
<TabsContent value="submit" className="space-y-4">
    {/* Code Tester (if challenge supports it) */}
    {challenge.runTests && (
        <CodeTester
            challengeId={challenge.id}
            code={code}
        />
    )}

    {/* Existing submission form */}
    <CodeSubmissionForm
        challengeId={challenge.id}
        cohortId={progress.cohortId}
        starterCode={challenge.starterCode}
        attemptNumber={submissions.length + 1}
    />
</TabsContent>
```

### User Experience Flow

1. Intern writes code in editor (Monaco or textarea)
2. Clicks "Run Tests" button
3. Loading state shows "Running tests..."
4. Results appear within 2-5 seconds:
   - ✅ All tests passed → Encourage submission
   - ❌ Tests failed → Show which tests failed and why
   - ⚠️ Error → Display error message

---

## Monitoring & Maintenance

### View Logs

```powershell
# View recent logs
gcloud run services logs read bakedbot-code-runner --region us-central1 --limit 50

# Tail logs (live)
gcloud run services logs tail bakedbot-code-runner --region us-central1

# Filter by status
gcloud run services logs read bakedbot-code-runner --region us-central1 --filter="severity=ERROR"
```

### Monitor Metrics

**Cloud Console:**
1. Navigate to Cloud Run → bakedbot-code-runner
2. View "Metrics" tab for:
   - Request count
   - Request latency (p50, p95, p99)
   - Instance count
   - CPU utilization
   - Memory utilization

**Key metrics to watch:**
- **Latency p95:** Should be < 5s
- **Error rate:** Should be < 1%
- **Instance count:** Auto-scales 0-100
- **CPU utilization:** Should be < 80%

### Set Up Alerts

```powershell
# Create alert for high error rate
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Code Runner High Error Rate" \
    --condition-display-name="Error rate > 5%" \
    --condition-threshold-value=5 \
    --condition-threshold-duration=300s
```

### Cost Monitoring

**Firestore:**
- Collection: `codeExecutions`
- Fields: userId, challengeId, timestamp, success, executionTime
- Purpose: Rate limiting and analytics

**Query cost analysis:**
```typescript
// Weekly execution count
const weeklyExecutions = await db.collection('codeExecutions')
    .where('timestamp', '>=', oneWeekAgo)
    .count()
    .get();
```

---

## Troubleshooting

### Service Won't Start

**Error:** "Container failed to start"

**Solution:**
```powershell
# Check build logs
gcloud builds list --limit=1

# View detailed logs
gcloud builds log BUILD_ID
```

### High Latency

**Symptom:** Executions taking >10s

**Possible causes:**
1. **Cold start:** First request after idle
   - Solution: Set min-instances=1 (costs ~$5/month)

2. **Complex tests:** Tests taking too long
   - Solution: Optimize test code or increase timeout

3. **Resource limits:** Memory/CPU insufficient
   - Solution: Increase to 1GB memory

### Rate Limiting Issues

**Error:** "Rate limit exceeded"

**Check rate limit:**
```typescript
// In Firestore Console
db.collection('codeExecutions')
  .where('userId', '==', 'USER_ID')
  .where('timestamp', '>=', oneMinuteAgo)
  .count();
```

**Adjust limit:**
```typescript
// In src/app/api/training/execute/route.ts
// Change: return count < 10;
// To:     return count < 20; // Allow 20/minute
```

### Container Security

**Verify isolation:**
```powershell
# Test that network is disabled
curl -X POST SERVICE_URL/execute -d '{
  "code": "fetch(\"https://example.com\")",
  "tests": "test(\"t\", () => {})",
  "language": "typescript"
}'

# Should fail with network error
```

---

## Scaling Considerations

### For 500 Interns

**Expected load:**
- 500 users × 5 challenges/week × 3 test runs/challenge = 7,500 executions/week
- Peak: 100 concurrent users = ~20 requests/second

**Current limits:**
- Max instances: 100
- Concurrency: 80 requests/instance
- Capacity: 8,000 concurrent requests

**Conclusion:** Current setup handles 500 interns easily ✅

### Auto-Scaling

Cloud Run auto-scales based on:
- Request concurrency (target: 80)
- CPU utilization (target: 80%)
- Memory utilization

**Manual scaling:**
```powershell
# Increase max instances if needed
gcloud run services update bakedbot-code-runner \
    --max-instances=200 \
    --region=us-central1
```

---

## Local Development

### Run Service Locally

```powershell
# Navigate to service directory
cd cloud-run/code-runner

# Install dependencies
npm install

# Run in dev mode
npm run dev
```

**Service runs on:** `http://localhost:8080`

### Test Locally

```powershell
# Test health
curl http://localhost:8080/health

# Test execution
curl -X POST http://localhost:8080/execute \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

### Build Docker Image Locally

```powershell
# Build
docker build -t bakedbot-code-runner .

# Run
docker run -p 8080:8080 bakedbot-code-runner

# Test
curl http://localhost:8080/health
```

---

## Security Best Practices

✅ **Implemented:**
- Network isolation (no outbound connections during execution)
- Resource limits (CPU, memory, timeout)
- Input validation (code size, dangerous patterns)
- Non-root user in container
- Rate limiting per user

⚠️ **Additional recommendations:**
- Use VPC for Cloud Run (enterprise)
- Enable Binary Authorization (sign images)
- Rotate service accounts regularly
- Monitor for abuse patterns

---

## Future Enhancements

### Phase 2.1: Advanced Features
- [ ] Multi-file submissions
- [ ] npm package installation
- [ ] Code coverage reports
- [ ] Performance profiling

### Phase 2.2: Enhanced Testing
- [ ] Browser automation (Playwright)
- [ ] Visual regression tests
- [ ] API integration tests
- [ ] Database fixtures

### Phase 2.3: Developer Experience
- [ ] Live preview for React components
- [ ] Interactive debugger
- [ ] AI-powered test suggestions

---

## Support

**Issues with code execution?**
- Check Cloud Run logs first
- Verify CODE_RUNNER_URL is correct
- Test health endpoint
- Check Firestore rate limit collection

**Performance issues?**
- Review metrics in Cloud Console
- Check p95 latency
- Verify instance scaling

**Questions?**
- Slack: #bakedbot-training-admin
- Docs: CODE_EXECUTION_ARCHITECTURE.md
