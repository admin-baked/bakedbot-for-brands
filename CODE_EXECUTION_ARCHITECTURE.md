# Server-Side Code Execution Architecture

## Overview

Secure, isolated code execution system for training challenges. Allows interns to run their code and see test results before submitting for review.

**Design Goals:**
- ✅ **Secure** - Isolated execution with no access to production systems
- ✅ **Fast** - Results in < 5 seconds
- ✅ **Cost-effective** - Cloud Run cheaper than WebContainers (~$0.10/1000 executions)
- ✅ **Scalable** - Handles 500+ concurrent users
- ✅ **Testable** - Runs Jest tests for submitted code

---

## Architecture

```
┌─────────────────┐
│   Browser/UI    │
│  (Submit Code)  │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────┐
│  Next.js API Route          │
│  /api/training/execute      │
│  - Validates request        │
│  - Checks auth              │
│  - Queues execution         │
└────────┬────────────────────┘
         │ HTTP
         ▼
┌─────────────────────────────┐
│  Cloud Run Service          │
│  bakedbot-code-runner       │
│  - Node 20 + TypeScript     │
│  - Isolated execution       │
│  - Runs tests with Jest     │
│  - Returns results          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Response                   │
│  - stdout/stderr            │
│  - Test results             │
│  - Execution time           │
│  - Error messages           │
└─────────────────────────────┘
```

---

## Cloud Run Service

### Docker Image: `bakedbot-code-runner`

**Base:** `node:20-alpine`

**Installed:**
- TypeScript 5.x
- Jest + ts-jest
- Limited npm packages (no network access during execution)

**API Endpoint:** `POST /execute`

**Request:**
```json
{
  "code": "export function add(a: number, b: number) { return a + b; }",
  "tests": "test('adds', () => { expect(add(1, 2)).toBe(3); });",
  "language": "typescript",
  "timeout": 10000
}
```

**Response:**
```json
{
  "success": true,
  "output": "PASS  tests/code.test.ts\n  ✓ adds (2 ms)",
  "testResults": {
    "numPassedTests": 1,
    "numFailedTests": 0,
    "testResults": [
      {
        "title": "adds",
        "status": "passed",
        "duration": 2
      }
    ]
  },
  "executionTime": 342,
  "error": null
}
```

---

## Security Measures

### Container Isolation
- No network access during code execution
- Read-only filesystem (except /tmp)
- Memory limit: 512MB
- CPU limit: 1 vCPU
- Execution timeout: 10 seconds

### Code Validation
- Maximum code size: 50KB
- No `eval()`, `Function()`, or dynamic imports
- Whitelist allowed imports:
  - `@/server/auth/auth`
  - `@/lib/logger`
  - `@/firebase/admin`
  - Standard Node.js modules

### Rate Limiting
- 10 executions per minute per user
- 100 executions per hour per user
- Queue-based execution to prevent overload

---

## Implementation Files

### 1. Cloud Run Service

**File Structure:**
```
cloud-run/
├── code-runner/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── executor.ts       # Code execution logic
│   │   └── validator.ts      # Input validation
│   └── deploy.sh             # Deployment script
```

### 2. Next.js API Route

**File:** `src/app/api/training/execute/route.ts`

**Responsibilities:**
- Authenticate user (requireUser)
- Validate code input
- Call Cloud Run service
- Log execution metrics
- Return results to client

### 3. UI Components

**File:** `src/app/dashboard/training/components/code-tester.tsx`

**Features:**
- Run code button
- Loading state during execution
- Display stdout/stderr
- Show test results (pass/fail)
- Execution time display

---

## Execution Flow

### 1. User Submits Code

```typescript
// In browser
const response = await fetch('/api/training/execute', {
    method: 'POST',
    body: JSON.stringify({
        challengeId: 'week1-ch1',
        code: userCode,
    }),
});
```

### 2. API Route Validates & Forwards

```typescript
// src/app/api/training/execute/route.ts
export async function POST(req: Request) {
    const user = await requireUser(['intern', 'super_user']);

    // Rate limiting check
    await checkRateLimit(user.uid);

    // Get challenge tests
    const challenge = await getChallenge(challengeId);

    // Call Cloud Run
    const result = await executeCode({
        code,
        tests: challenge.testCode,
        timeout: 10000,
    });

    return Response.json(result);
}
```

### 3. Cloud Run Executes Code

```typescript
// In Cloud Run container
async function executeCode(input: ExecutionInput): Promise<ExecutionResult> {
    // 1. Create temp directory
    const tmpDir = await fs.mkdtemp('/tmp/code-');

    // 2. Write code to file
    await fs.writeFile(`${tmpDir}/code.ts`, input.code);
    await fs.writeFile(`${tmpDir}/code.test.ts`, input.tests);

    // 3. Run Jest
    const result = await runJest(tmpDir, input.timeout);

    // 4. Parse results
    return {
        success: result.success,
        output: result.stdout,
        testResults: parseJestOutput(result),
        executionTime: result.duration,
    };
}
```

### 4. Results Returned to UI

```typescript
// Display results
if (result.success) {
    showSuccess(`✅ All ${result.testResults.numPassedTests} tests passed!`);
} else {
    showError(`❌ ${result.testResults.numFailedTests} tests failed`);
    displayFailedTests(result.testResults.testResults);
}
```

---

## Cost Analysis

### Cloud Run Pricing (us-central1)

**CPU:** $0.00002400 per vCPU-second
**Memory:** $0.00000250 per GiB-second
**Requests:** $0.40 per million requests

**Per Execution:**
- Duration: 1 second (average)
- CPU: 1 vCPU
- Memory: 512MB

**Cost:** ~$0.00003 per execution

**For 500 interns × 5 challenges/week:**
- Executions: ~5,000/week (with retries)
- Monthly cost: ~$0.60
- Annual cost: ~$7.20

**Free tier:** 2 million vCPU-seconds/month = plenty for training use

---

## Challenge Test Code

Challenges include test specifications:

```typescript
interface TrainingChallenge {
    // ... existing fields
    testCode?: string;           // Jest test code
    testCases?: TestCase[];      // Expected inputs/outputs
    runTests: boolean;           // Enable code execution
}

interface TestCase {
    input: any;
    expected: any;
    description: string;
}
```

**Example Challenge Test:**

```typescript
// Week 1 Challenge 1: Hello BakedBot
testCode: `
import { greetIntern } from './code';

describe('greetIntern', () => {
    test('returns greeting with name', async () => {
        const result = await greetIntern('Alex');
        expect(result.success).toBe(true);
        expect(result.data.message).toContain('Alex');
        expect(result.data.message).toContain('Welcome');
    });

    test('handles authentication', async () => {
        // Mock requireUser to test auth
        jest.mock('@/server/auth/auth', () => ({
            requireUser: jest.fn().mockResolvedValue({ uid: 'test' })
        }));

        const result = await greetIntern('Test');
        expect(result.success).toBe(true);
    });
});
`
```

---

## Monitoring & Logging

### Metrics to Track

```typescript
{
    executionId: string;
    userId: string;
    challengeId: string;
    success: boolean;
    executionTime: number;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    timestamp: Timestamp;
    errorMessage?: string;
}
```

### Alerts

- **High failure rate** (>50% failures in 1 hour)
- **Slow executions** (>5s average)
- **Rate limit exceeded** (user hitting limits)
- **Service errors** (Cloud Run 500s)

---

## Rollout Plan

### Phase 2.1: Infrastructure (Week 1)
- [ ] Build Docker image
- [ ] Deploy to Cloud Run
- [ ] Test with sample code
- [ ] Set up monitoring

### Phase 2.2: Integration (Week 2)
- [ ] Build API route
- [ ] Create UI components
- [ ] Add to Week 1 challenges
- [ ] Test with pilot interns

### Phase 2.3: Scale (Week 3)
- [ ] Add test specs to all challenges
- [ ] Optimize container startup
- [ ] Fine-tune rate limits
- [ ] Full rollout

---

## Alternative: Docker Sandbox (Backup)

If Cloud Run proves too complex:

**Use:** `isolated-vm` npm package
**Runs:** V8 isolates in-process
**Pros:** Simpler, no Docker needed
**Cons:** Less secure, harder to install packages

```typescript
import ivm from 'isolated-vm';

async function executeCodeLocally(code: string): Promise<ExecutionResult> {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();

    try {
        const result = await context.eval(code, { timeout: 5000 });
        return { success: true, output: result };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

---

## Testing Strategy

### Unit Tests
- Validator logic
- Test result parsing
- Rate limiting

### Integration Tests
- Full execution flow
- Error handling
- Timeout scenarios

### Load Tests
- 100 concurrent executions
- Measure p95 latency
- Verify rate limiting

---

## Future Enhancements

### Phase 3+
- [ ] Multi-file submissions (file tree)
- [ ] npm package installation
- [ ] Browser automation (Playwright tests)
- [ ] Code coverage reports
- [ ] Performance profiling
- [ ] Visual test output (screenshots)

---

## Documentation Links

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Jest Testing Framework](https://jestjs.io/)
- [isolated-vm (Alternative)](https://github.com/laverdet/isolated-vm)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
