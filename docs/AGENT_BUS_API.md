# Agent Bus API Documentation

## Overview

The **Agent Bus** is an asynchronous messaging system that enables agents to communicate with each other without direct dependencies. It provides a decoupled architecture for multi-agent coordination using Firestore as the message queue.

**Status**: Ready for Extension | **Last Updated**: 2026-02-18

---

## Architecture

```
Agent A                Agent Bus (Firestore)              Agent B
┌─────────┐                ┌──────────────┐            ┌─────────┐
│ Craig   │──Post msg──→   │ agent_bus/{} │  ←─Poll──  │ Deebo   │
│         │                │              │            │         │
│ Send    │                │ Messages     │            │ Receive │
│ findings│                │ pending: []  │            │ & Act   │
└─────────┘                └──────────────┘            └─────────┘
                                  ↓
                           Firestore Collection:
                         tenants/{orgId}/agent_bus
```

---

## Core Concepts

### Message Types

```typescript
type AgentBusMessage = {
    id: string;                      // UUID
    from_agent: string;              // Sender: 'craig', 'ezal', 'leo', etc.
    to_agents: string[];             // Recipients: ['deebo'], or ['*'] for broadcast
    message_type: string;            // 'delegation', 'finding', 'request', 'alert'
    payload: Record<string, any>;    // Message data
    priority: 'low' | 'normal' | 'high'; // Processing order
    status: 'pending' | 'delivered' | 'acknowledged'; // Lifecycle
    created_at: Timestamp;
    expires_at: Timestamp;           // Auto-cleanup TTL
    responses: Record<string, any>;  // Replies from recipients
};
```

### Message Flow

```
1. POST          2. QUEUE          3. POLL            4. PROCESS       5. ACKNOWLEDGE
Agent sends  →   Message stored  →  Agent checks   →   Agent acts    →   Mark delivered
message to bus   in Firestore       for new msgs      on payload        in bus
```

---

## API Reference

### 1. Post Message to Bus

**Function**: `postAgentBusMessage()`

```typescript
import { postAgentBusMessage } from '@/server/services/agent-bus';

const result = await postAgentBusMessage(
    brandId,
    'craig',                          // from_agent
    ['deebo'],                        // to_agents
    'campaign_review_request',        // message_type
    {
        campaign_id: 'camp_123',
        campaign_name: 'Summer Sale',
        content: 'Limited time offer...',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
);

// Returns:
// {
//   success: true,
//   message_id: 'msg_abc123',
//   delivered_to: ['deebo']
// }
```

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `brandId` | string | Yes | Organization ID |
| `fromAgent` | string | Yes | Sender agent name |
| `toAgents` | string[] | Yes | Recipient agents (or ['*'] for broadcast) |
| `messageType` | string | Yes | Type of message |
| `payload` | object | Yes | Message data |
| `priority` | string | No | 'low' \| 'normal' \| 'high' (default: 'normal') |
| `expiresIn` | number | No | TTL in seconds (default: 7 days) |

---

### 2. Poll for Pending Messages

**Function**: `getPendingMessages()`

```typescript
import { getPendingMessages } from '@/server/services/agent-bus';

// In agent harness (harness.ts, lines 56-65)
const messages = await getPendingMessages(brandId, 'deebo');

// Returns:
// [
//   {
//     id: 'msg_abc123',
//     from_agent: 'craig',
//     message_type: 'campaign_review_request',
//     payload: { campaign_id: 'camp_123', ... },
//     created_at: Timestamp,
//   }
// ]
```

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `brandId` | string | Yes | Organization ID |
| `agentName` | string | Yes | Agent receiving messages |
| `limit` | number | No | Max messages to return (default: 10) |
| `priority` | string | No | Filter by priority |

**Integration with Harness**:
```typescript
// In harness.ts - automatically called during agent initialization
try {
    const { getPendingMessages } = await import('../intuition/agent-bus');
    const messages = await getPendingMessages(brandId, agentName);
    if (messages.length > 0) {
        logger.info(`[Harness] ${agentName}: Has ${messages.length} pending messages.`);
        // Inject messages into agentMemory for processing
        (agentMemory as any).pending_messages = messages;
    }
} catch (e) {
    // Ignore bus errors, don't crash agent
}
```

---

### 3. Mark Message as Processed

**Function**: `acknowledgeMessage()`

```typescript
import { acknowledgeMessage } from '@/server/services/agent-bus';

await acknowledgeMessage(brandId, 'msg_abc123', {
    status: 'acknowledged',
    response: 'Campaign review approved',
    response_data: {
        compliance_issues: [],
        feedback: 'Ready for scheduling',
    },
});
```

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `brandId` | string | Yes | Organization ID |
| `messageId` | string | Yes | ID of message to acknowledge |
| `responseData` | object | No | Agent's response |

---

### 4. Broadcast to All Agents

**Function**: `broadcastAgentMessage()`

```typescript
import { broadcastAgentMessage } from '@/server/services/agent-bus';

await broadcastAgentMessage(
    brandId,
    'leo',
    'system_alert',
    {
        alert_type: 'priority_shift',
        message: 'New high-priority objective assigned',
        objective_id: 'obj_789',
    },
    'high'
);

// All agents receive and process this message
```

---

### 5. Query Message History

**Function**: `getMessageHistory()`

```typescript
import { getMessageHistory } from '@/server/services/agent-bus';

const history = await getMessageHistory(
    brandId,
    {
        from_agent: 'craig',
        to_agent: 'deebo',
        message_type: 'campaign_review_request',
        days: 30,
    }
);

// Returns: [message, message, ...]
// Useful for debugging, analytics, audit trails
```

---

## Usage Patterns

### Pattern 1: Delegation (Leo → Agent)

```typescript
// Leo (COO) delegates work to Craig (Marketer)
await postAgentBusMessage(
    brandId,
    'leo',
    ['craig'],
    'delegation',
    {
        task_id: 'task_100',
        task: 'Create email campaign for Q2',
        context: { budget: 5000, audience: 'repeat_customers' },
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    'high' // High priority
);

// Craig's agent polls and sees:
// pending_messages: [{ task_id: 'task_100', task: '...', ... }]
// Craig.act() processes the message and returns result
```

### Pattern 2: Research Sharing (Ezal → Craig)

```typescript
// Ezal discovers competitor pricing, shares with Craig
await postAgentBusMessage(
    brandId,
    'ezal',
    ['craig', 'money_mike'],  // Broadcast to multiple agents
    'research_finding',
    {
        topic: 'competitor_pricing',
        finding: 'Competitor A is 15% cheaper on premium strains',
        confidence: 'high',
        relevant_to: ['craig', 'money_mike'],
    }
);

// Craig polls and receives:
// pending_messages: [{ topic: '...', finding: '...', confidence: 'high' }]
// Craig.act() incorporates finding into campaign strategy
```

### Pattern 3: Review Request (Craig → Deebo)

```typescript
// Craig (Marketer) requests compliance review from Deebo
await postAgentBusMessage(
    brandId,
    'craig',
    ['deebo'],
    'compliance_review_request',
    {
        campaign_id: 'camp_123',
        campaign_name: 'Summer Sale',
        channels: ['email', 'sms'],
        content: 'Get 20% off! Limited time only...',
    },
    'high'
);

// Deebo polls and sees request
// Deebo.act() analyzes for compliance issues, posts response
await acknowledgeMessage(brandId, messageId, {
    response: 'approved',
    response_data: {
        compliance_issues: [],
        notes: 'All good for CA market'
    }
});

// Craig polls and receives Deebo's acknowledgment
// Updates campaign_reviews in memory
```

---

## Error Handling

### Common Errors

```typescript
try {
    const messages = await getPendingMessages(brandId, agentName);
} catch (error) {
    if (error.code === 'FIRESTORE_UNAVAILABLE') {
        logger.warn('[AgentBus] Firestore temporarily unavailable');
        // Agent continues, retries on next cycle
    } else if (error.code === 'PERMISSION_DENIED') {
        logger.error('[AgentBus] Agent lacks permission to access bus');
        // Check Firestore rules
    } else {
        logger.error('[AgentBus] Unexpected error:', error);
        // Non-fatal error in harness, agent still runs
    }
}
```

### Best Practices

1. **Non-blocking**: Bus errors don't crash agents (wrapped in try-catch in harness)
2. **Timeout**: Long polls timeout after 30 seconds
3. **Retry**: Failed messages are re-queued with exponential backoff
4. **Cleanup**: Messages auto-expire after 7 days (configurable)
5. **Ordering**: High-priority messages processed first

---

## Firestore Collection Schema

```
tenants/{orgId}/agent_bus/
├── {messageId}
│   ├── from_agent: 'craig'
│   ├── to_agents: ['deebo']
│   ├── message_type: 'campaign_review_request'
│   ├── payload: {...}
│   ├── status: 'pending'
│   ├── priority: 'high'
│   ├── created_at: Timestamp
│   ├── expires_at: Timestamp
│   └── responses: {}
```

**Indexes**:
```json
{
  "collectionGroup": "agent_bus",
  "fields": [
    { "fieldPath": "to_agents", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "created_at", "order": "DESCENDING" }
  ]
}
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// Message delivery rate
const metrics = {
    total_messages_posted: 450,
    successfully_delivered: 440,
    failed_delivery: 10,
    avg_delivery_time_ms: 250,
    pending_messages_now: 8,
};

// By message type
const by_type = {
    'delegation': 150,
    'research_finding': 180,
    'review_request': 90,
    'alert': 30,
};

// By agent pair (most active collaborations)
const by_agents = {
    'craig -> deebo': 85,      // Craig sends many review requests to Deebo
    'ezal -> craig': 72,       // Ezal shares research with Craig
    'leo -> all': 45,          // Leo broadcasts to entire team
};
```

### Query for Debugging

```typescript
// Get all messages for a campaign
const campaignMessages = await getMessageHistory(brandId, {
    payload_contains: { campaign_id: 'camp_123' },
    days: 30,
});

// Get stuck messages (pending > 1 hour)
const stuckMessages = await db
    .collection(`tenants/${brandId}/agent_bus`)
    .where('status', '==', 'pending')
    .where('created_at', '<', new Date(Date.now() - 60 * 60 * 1000))
    .get();
```

---

## Configuration

### Environment Variables

```bash
# .env or apphosting.yaml
AGENT_BUS_ENABLED=true
AGENT_BUS_DEFAULT_TTL_DAYS=7
AGENT_BUS_POLL_TIMEOUT_MS=30000
AGENT_BUS_MAX_MESSAGE_SIZE_BYTES=262144  # 256KB
```

### Firestore Rules

```
match /tenants/{orgId}/agent_bus/{messageId} {
  allow read: if request.auth != null &&
              (request.auth.token.orgId == orgId ||
               request.auth.token.role == 'super_user');
  allow create: if request.auth != null &&
                request.auth.token.role in ['agent', 'super_user'];
  allow update: if resource.data.status == 'pending' &&
                request.resource.data.status in ['delivered', 'acknowledged'];
  allow delete: if request.auth.token.role == 'super_user' &&
                resource.data.status != 'pending';
}
```

---

## Examples

### Example 1: Complete Delegation Flow

```typescript
// Step 1: Leo delegates to Craig
await postAgentBusMessage(
    'org_thrive',
    'leo',
    ['craig'],
    'delegation',
    {
        task_id: 'task_001',
        task: 'Draft Q2 email campaign',
        budget: 5000,
        audience: 'inactive_customers',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    'high'
);

// Step 2: Craig's agent polls (in harness)
const messages = await getPendingMessages('org_thrive', 'craig');
// messages[0] = { task_id: 'task_001', task: 'Draft Q2...', ... }

// Step 3: Craig processes and requests Deebo review
await postAgentBusMessage(
    'org_thrive',
    'craig',
    ['deebo'],
    'compliance_review_request',
    {
        campaign_id: 'camp_456',
        campaign_name: 'Q2 Inactive Win-Back',
        content: 'Come back and get 15% off your next order!',
    },
    'high'
);

// Step 4: Deebo reviews and responds
const deeboMessages = await getPendingMessages('org_thrive', 'deebo');
await acknowledgeMessage('org_thrive', deeboMessages[0].id, {
    response: 'approved',
    response_data: { compliance_ok: true },
});

// Step 5: Craig receives approval and schedules campaign
const craigMessages = await getPendingMessages('org_thrive', 'craig');
// Can see Deebo's approval and proceed

// Step 6: Leo checks on task
const taskHistory = await getMessageHistory('org_thrive', {
    from_agent: 'leo',
    to_agent: 'craig',
    task_id: 'task_001',
});
// Can track full delegation lifecycle
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Agent doesn't see pending messages | Poll timeout or permission denied | Check Firestore rules, increase timeout |
| Messages not being cleaned up | Expiration not set | Ensure `expires_at` is set (default 7 days) |
| High latency (>1000ms) | Firestore under load | Reduce poll frequency, use high-priority for urgent |
| Messages stuck in "pending" | No acknowledgment received | Agent may have crashed; check logs |

---

## Future Enhancements

- [ ] Dead letter queue for failed messages
- [ ] Message retry with exponential backoff
- [ ] Pub/Sub as alternative to polling (for low-latency)
- [ ] Message ordering guarantees
- [ ] Encryption for sensitive payloads
- [ ] Rate limiting per agent

---

## Related Documentation

- [Cross-Agent Collaboration Guide](./CROSS_AGENT_COLLABORATION.md)
- [Agent Architecture](./AGENT_ARCHITECTURE.md)
- [Harness Implementation](./HARNESS.md)
- [Letta Memory System](./LETTA_MEMORY.md)
