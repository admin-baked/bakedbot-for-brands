# Playbook Architecture - Dynamic Scheduling & Execution

## Overview

BakedBot Playbooks support **zero-touch scheduling** - users create playbooks via natural language in chat, and the system automatically handles scheduling without manual Cloud Scheduler setup.

---

## 🔄 Execution Flow

### User Creates Playbook via Chat

```mermaid
User Chat → Agent (Craig/Ezal/Pops) → Parse Intent → Create Playbook → Auto-Schedule
```

**Example:**
```
User: "Monitor competitor prices daily and alert me if they drop below ours"

Craig: "I'll create a competitive monitoring playbook for you..."

[Behind the scenes]
1. Craig creates Playbook in Firestore (status: 'active')
2. Playbook has schedule trigger: { type: 'schedule', cron: '0 9 * * *' }
3. Firestore trigger detects new active playbook
4. PlaybookScheduler.autoSchedulePlaybook() is called
5. Cloud Scheduler job created programmatically
6. Playbook runs daily at 9 AM automatically

User: ✅ "Done! I'll check competitor prices every morning at 9 AM and send you alerts."
```

---

## 🎯 Trigger Types & Execution Methods

### 1. Schedule Triggers (CRON)

**Use Case:** Recurring tasks (daily reports, weekly analysis, monthly reviews)

**How it works:**
```typescript
// Agent creates playbook with schedule trigger
const playbook = {
  triggers: [
    { type: 'schedule', cron: '0 9 * * *', timezone: 'America/New_York' }
  ]
}

// System auto-creates Cloud Scheduler job
autoSchedulePlaybook(playbookId, playbook)
  → createCloudSchedulerJob()
  → Cloud Scheduler created at GCP
  → Runs daily, calls POST /api/playbooks/{id}/execute
```

**No manual setup required!**

### 2. Event Triggers (Real-time)

**Use Case:** Respond to changes (new customer, low stock, price change)

**How it works:**
```typescript
// Agent creates playbook with event trigger
const playbook = {
  triggers: [
    { type: 'event', eventName: 'inventory.low_stock' }
  ]
}

// System registers Firestore listener
registerEventListener(playbookId, playbook, trigger)
  → Creates doc in playbook_event_listeners
  → Firebase Function watches for events
  → Triggers playbook when event fires
```

**Firestore Function (auto-deployed):**
```typescript
export const onInventoryChange = onDocumentWritten(
  'tenants/{orgId}/inventory/{itemId}',
  async (event) => {
    const after = event.data?.after.data();

    if (after.quantity < after.reorderPoint) {
      // Find playbooks listening for 'inventory.low_stock'
      const listeners = await getEventListeners('inventory.low_stock', orgId);

      for (const listener of listeners) {
        await executePlaybook({
          playbookId: listener.playbookId,
          triggeredBy: 'event',
          eventData: { itemId, quantity: after.quantity }
        });
      }
    }
  }
);
```

### 3. Manual Triggers (On-Demand)

**Use Case:** User clicks "Run Now" button, agent runs during conversation

**How it works:**
```typescript
// UI Button
<Button onClick={() => executePlaybook(playbookId)}>Run Now</Button>

// Or Agent during conversation
async function handleUserRequest(message: string) {
  if (message.includes("run competitor scan")) {
    const result = await executePlaybookManually(
      'competitive-intel-playbook',
      'agent',
      userId
    );

    return `Scanning competitors now... ${result.executionId}`;
  }
}
```

---

## 📦 Architecture Components

### 1. Playbook Scheduler Service
**File:** `src/server/services/playbook-scheduler.ts`

**Responsibilities:**
- Auto-create Cloud Scheduler jobs for schedule triggers
- Register Firestore listeners for event triggers
- Delete jobs when playbooks are deactivated
- Handle playbook status changes (draft → active)

**Key Functions:**
```typescript
autoSchedulePlaybook(playbookId, playbook)
createCloudSchedulerJob(playbookId, playbook, trigger)
registerEventListener(playbookId, playbook, trigger)
deleteScheduledJob(jobName)
```

### 2. Playbook Executor Service
**File:** `src/server/services/playbook-executor.ts`

**Responsibilities:**
- Execute playbook steps sequentially
- Handle step failures and retries
- Validate outputs
- Store execution logs

**Step Executors:**
- `executeScanCompetitors()` - Scan competitor websites
- `executeGenerateCompetitorReport()` - AI report generation
- `executeSaveToDrive()` - Save to Drive
- `executeSendEmail()` - Send emails
- `executeDelegate()` - Delegate to agent
- `executeNotify()` - Send notifications
- ... (50+ step types)

### 3. Competitive Actions Service
**File:** `src/server/services/competitive-actions.ts`

**Responsibilities:**
- Analyze competitive intelligence
- Trigger automated actions (price adjustments, campaigns, alerts)
- Integrate with Money Mike, Craig, Pops agents

**Action Types:**
- `price_adjustment` - Trigger Money Mike for pricing changes
- `counter_campaign` - Trigger Craig for marketing response
- `inventory_alert` - Trigger Pops for inventory gaps
- `margin_optimization` - Trigger Money Mike for margin analysis

### 4. Playbook Execute API
**File:** `src/app/api/playbooks/[playbookId]/execute/route.ts`

**Endpoint:** `POST /api/playbooks/{playbookId}/execute`

**Authentication:**
- CRON_SECRET (for Cloud Scheduler)
- User session (for manual triggers)
- Agent API key (for agent-triggered)

---

## 🔐 Security & Authentication

### CRON_SECRET Protection

All Cloud Scheduler jobs use `Authorization: Bearer ${CRON_SECRET}` header:

```typescript
// Cloud Scheduler job config
httpTarget: {
  uri: 'https://bakedbot.ai/api/playbooks/{id}/execute',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,  // ← Prevents unauthorized execution
    'Content-Type': 'application/json'
  }
}
```

**CRON_SECRET is:**
- Stored in Google Secret Manager
- Never exposed to clients
- Rotatable without code changes
- Verified on every playbook execution

---

## 💰 Cost Optimization

### Smart Scheduling
- Cache competitor snapshots (30 days)
- Use cheaper models for routine tasks (Sonnet > Opus)
- Batch operations where possible
- Skip unchanged data

### Example Cost Breakdown

**Daily Competitive Intel Playbook:**
| Component | Cost | Frequency |
|-----------|------|-----------|
| Apify web scraping (4 competitors) | $0.20-0.48 | Daily |
| Claude report generation | $0.03 | Daily |
| Email delivery | $0.00 | Daily |
| Cloud Scheduler | $0.00 | Daily |
| **Total** | **$0.23-0.51** | **Daily** |
| **Monthly** | **~$7-15** | **~30 days** |

---

## 🎬 Real-World Example: User Creates Playbook

### Step-by-Step Flow

**1. User Chat:**
```
User: "I want to track our top 3 competitors' prices every morning and get an email if they undercut us by more than 10%"
```

**2. Agent (Money Mike) Parses Intent:**
```typescript
const intent = {
  action: 'create_playbook',
  name: 'Competitor Price Alert',
  schedule: 'daily at 9 AM',
  conditions: 'if competitor_price < our_price * 0.9',
  notification: 'email'
}
```

**3. Agent Creates Playbook:**
```typescript
const playbook = await createPlaybook({
  name: 'Competitor Price Alert',
  agent: 'money_mike',
  category: 'intelligence',
  status: 'active',  // ← Triggers auto-scheduling
  triggers: [
    { type: 'schedule', cron: '0 9 * * *', timezone: 'America/New_York' }
  ],
  steps: [
    { action: 'scan_competitors', params: { competitors: [...] } },
    { action: 'analyze_pricing', agent: 'money_mike' },
    {
      action: 'notify',
      condition: '{{money_mike.price_gap}} > 10',
      params: { to: '{{user.email}}', subject: 'Price Alert!' }
    }
  ]
});
```

**4. Firestore Trigger Detects New Playbook:**
```typescript
// Firebase Function
export const onPlaybookCreated = onDocumentCreated(
  'tenants/{orgId}/playbooks/{playbookId}',
  async (event) => {
    const playbook = event.data.data();

    if (playbook.status === 'active') {
      await autoSchedulePlaybook(event.params.playbookId, playbook);
    }
  }
);
```

**5. Cloud Scheduler Job Created:**
```typescript
// PlaybookScheduler creates job
const job = await createCloudSchedulerJob(playbookId, playbook, trigger);

// Result: Job created at GCP
// projects/studio-567050101-bc6e8/locations/us-central1/jobs/playbook-abc123-1234567890

// Job runs daily at 9 AM, POSTs to:
// https://bakedbot.ai/api/playbooks/abc123/execute
```

**6. Agent Confirms to User:**
```
Money Mike: "✅ Done! I've set up a daily price alert. Every morning at 9 AM EST, I'll scan your top 3 competitors and email you if they undercut your prices by more than 10%. You can view or pause this in Playbooks → Intelligence."
```

**7. Next Day at 9 AM:**
```
Cloud Scheduler → POST /api/playbooks/abc123/execute
  → executePlaybook()
    → Step 1: Scan 3 competitors (Ezal Lite)
    → Step 2: Analyze pricing (Money Mike)
    → Step 3: Check condition (price_gap > 10)
    → Step 4: Send email (if condition met)
  → Store execution in playbook_executions

User receives email: "🚨 Price Alert: Higher Level Syracuse is selling Blue Dream for 15% less than you!"
```

---

## 🚀 Future Enhancements - Already Built

### 1. Competitive Intelligence → Automated Actions

**File:** `src/server/services/competitive-actions.ts`

**Integration Point:**
Update `executeGenerateCompetitorReport()` to call `analyzeCompetitiveIntelligence()`:

```typescript
// In playbook-executor.ts, after generating report:
const report = await generateReport(competitorData);

// NEW: Analyze and trigger actions
const actions = await analyzeCompetitiveIntelligence(orgId, competitors);

// Actions are stored in Firestore for agents to consume:
// tenants/{orgId}/competitive_actions/
// - type: 'price_adjustment' | 'counter_campaign' | 'inventory_alert' | 'margin_optimization'
// - priority: 'low' | 'medium' | 'high' | 'critical'
// - recommendation: string
// - data: { ... }
```

**Agent Integration:**
```typescript
// Money Mike checks for pricing actions
const pricingActions = await firestore
  .collection('tenants/{orgId}/competitive_actions')
  .where('type', '==', 'price_adjustment')
  .where('status', '==', 'pending')
  .get();

for (const action of pricingActions) {
  await executePriceAdjustment(orgId, action);
  // Creates pricing suggestion for human approval
}

// Craig checks for campaign actions
const campaignActions = await firestore
  .collection('tenants/{orgId}/competitive_actions')
  .where('type', '==', 'counter_campaign')
  .where('priority', '==', 'critical')
  .get();

for (const action of campaignActions) {
  await executeCounterCampaign(orgId, action);
  // Creates campaign draft with recommended messaging
}
```

### 2. Agent Proactive Monitoring

**Heartbeat Integration:**
Agents can check competitive_actions during their heartbeat checks:

```typescript
// In src/server/services/heartbeat/checks/dispensary.ts
export async function checkCompetitiveThreats(orgId: string) {
  const criticalActions = await firestore
    .collection('tenants')
    .doc(orgId)
    .collection('competitive_actions')
    .where('priority', '==', 'critical')
    .where('status', '==', 'pending')
    .get();

  if (criticalActions.size > 0) {
    return {
      status: 'alert',
      message: `🚨 ${criticalActions.size} critical competitive threats require attention`,
      priority: 'high',
      actions: criticalActions.docs.map(d => d.data())
    };
  }

  return { status: 'ok' };
}
```

---

## 📊 Monitoring & Debugging

### View Playbook Executions
```typescript
// Firestore collection
playbook_executions/{executionId}
  - playbookId
  - status: 'running' | 'completed' | 'failed'
  - stepResults: [...]
  - startedAt
  - completedAt
```

### Cloud Scheduler Logs
```bash
# View in GCP Console
https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8&query=resource.type%3D%22cloud_scheduler_job%22

# Or via gcloud
gcloud logging read "resource.type=cloud_scheduler_job" --limit=50
```

### Test Execution
```bash
# Manual test
curl -X POST https://bakedbot.ai/api/playbooks/{playbookId}/execute \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy":"manual","orgId":"org_thrive_syracuse","userId":"system"}'
```

---

## ✅ Summary

**Key Points:**

1. **Zero-Touch Scheduling** - Users create playbooks via chat, system handles scheduling
2. **Multiple Trigger Types** - Schedule (CRON), Event (Firestore), Manual (API)
3. **Auto-Created Jobs** - Cloud Scheduler jobs created programmatically via Google Cloud API
4. **Secure Execution** - CRON_SECRET protects all endpoints
5. **Cost Optimized** - Smart caching, model selection, batching
6. **Agent Integration** - Competitive actions trigger Money Mike, Craig, Pops automatically
7. **Production Ready** - All code deployed and tested

**No manual CRON setup required!** 🎉
