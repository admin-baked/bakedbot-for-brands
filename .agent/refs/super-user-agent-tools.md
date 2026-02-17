# Super User Agent Tools Reference
**Last Updated:** 2026-02-17 | **Status:** ✅ Production

Complete reference for 28 agent-callable tools available to Super User agents (Leo/COO, Jack/CRO, Glenda/CMO, Mike/CFO, Linus/CTO).

---

## Quick Navigation

### Modules
1. **Heartbeat Monitoring** (7 tools) — System health checks and control
2. **Platform Analytics** (8 tools) — Business metrics and system operations
3. **User Administration** (5 tools) — Account lifecycle and promotions
4. **System Control** (6 tools) — Configuration and diagnostics

### By Use Case
- **"What's our system status?"** → `heartbeat_getStatus`
- **"Show me our MRR"** → `platform_getAnalytics`
- **"List all brands"** → `platform_listTenants`
- **"Show pending users"** → `user_getPending`
- **"What integrations are active?"** → `system_listIntegrations`

---

## Module 1: Heartbeat Monitoring Tools

### File Location
`src/server/agents/tools/domain/heartbeat-tools.ts` (136 lines)

### Tool 1: heartbeat_getStatus
**Purpose:** Get current heartbeat configuration and status

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  config?: {
    enabled: boolean;
    interval: number;
    activeHours: { start: number; end: number };
    quietHours?: { start: number; end: number };
    timezone: string;
    enabledChecks: string[];
    channels: string[];
  };
  availableChecks?: string[];
  error?: string;
}
```

**Use Case:** Leo asks "Is heartbeat enabled?" → returns config + list of 15+ available checks

### Tool 2: heartbeat_getHistory
**Purpose:** Retrieve recent heartbeat execution logs

**Parameters:**
- `limit?: number` — Max records to return (default: 20, max: 100)

**Returns:**
```typescript
{
  success: boolean;
  executions?: Array<{
    id: string;
    startedAt: Date;
    completedAt: Date;
    resultsCount: number;
    failureCount: number;
    duration: number;
    status: 'success' | 'partial' | 'failed';
  }>;
  error?: string;
}
```

**Use Case:** Debug tool — see when last heartbeat ran and how long it took

### Tool 3: heartbeat_getAlerts
**Purpose:** Get recent non-OK check results (alerts only, not successful checks)

**Parameters:**
- `limit?: number` — Max records to return (default: 50, max: 200)

**Returns:**
```typescript
{
  success: boolean;
  alerts?: Array<{
    id: string;
    checkId: string;
    status: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    details?: Record<string, any>;
  }>;
  count?: number;
  error?: string;
}
```

**Use Case:** Jack wants quick summary of system problems → get last 20 alerts

### Tool 4: heartbeat_trigger
**Purpose:** Manually force-run a heartbeat cycle (all enabled checks) immediately

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  checksRun?: number;
  results?: Array<{
    checkId: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }>;
  error?: string;
}
```

**Use Case:** Linus suspects a system issue → `heartbeat_trigger` immediately runs all checks + returns results

### Tool 5: heartbeat_configure
**Purpose:** Update heartbeat configuration settings

**Parameters:**
```typescript
{
  enabled?: boolean;
  interval?: number;  // seconds
  activeHours?: { start: number; end: number };  // 0-23
  quietHours?: { start: number; end: number } | null;
  timezone?: string;
  enabledChecks?: string[];  // Array of check IDs
  channels?: ('dashboard' | 'email' | 'sms' | 'whatsapp' | 'push')[];
  suppressAllClear?: boolean;  // Suppress "system recovered" messages
}
```

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Use Case:** Glenda wants to disable SMSalerts during quiet hours → `heartbeat_configure({ quietHours: { start: 22, end: 6 }, channels: ['dashboard', 'email'] })`

### Tool 6: heartbeat_toggleCheck
**Purpose:** Enable or disable a specific heartbeat check

**Parameters:**
- `checkId: string` — ID of check to toggle (e.g., "system_errors", "database_latency")
- `enabled: boolean` — True to enable, false to disable

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Use Case:** Mike notices false positives on a check → `heartbeat_toggleCheck("campaign_performance", false)` to disable it

### Tool 7: heartbeat_diagnose
**Purpose:** Full system health diagnostic report with recommended actions

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  healthy: boolean;
  issues?: Array<{
    category: string;
    severity: 'warning' | 'critical';
    message: string;
    recommendation: string;
  }>;
  info?: Record<string, any>;
  issueCount?: number;
  error?: string;
}
```

**Use Case:** Leo runs quarterly health review → `heartbeat_diagnose` returns all current issues + recommendations

---

## Module 2: Platform Analytics Tools

### File Location
`src/server/agents/tools/domain/platform-tools.ts` (203 lines)

### Tool 8: platform_getAnalytics
**Purpose:** Get platform-wide business metrics

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  analytics?: {
    revenue: {
      mrr: number;
      arr: number;
      arpu: number;
    };
    customers: {
      total: number;
      paying: number;
      churnRate: number;
    };
    signups: {
      this_week: number;
      this_month: number;
      total: number;
      recentSignups: Array<{
        email: string;
        signupDate: Date;
        role: string;
      }>;
    };
  };
  error?: string;
}
```

**Use Case:** Jack (CRO) asks "What's our revenue?" → get MRR, ARR, paying customer count, weekly signups

### Tool 9: platform_getHealthMetrics
**Purpose:** GCP monitoring data: CPU, memory, latency, error rates, alert status

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  metrics?: {
    cpu: {
      average: number;
      peak: number;
      timestamp: Date;
    };
    memory: {
      available: number;
      used: number;
      percentage: number;
    };
    latency: {
      p50: number;  // milliseconds
      p95: number;
      p99: number;
    };
    errorRate: {
      rate: number;  // percentage
      count: number;
      timestamp: Date;
    };
    alertStatus: 'healthy' | 'warning' | 'critical';
  };
  error?: string;
}
```

**Use Case:** Linus (CTO) checks system capacity → see if we're near limits before traffic spikes

### Tool 10: platform_listTenants
**Purpose:** List all brands and dispensaries on the platform

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  brands?: Array<{
    id: string;
    name: string;
    plan: string;
    status: 'active' | 'inactive' | 'paused';
    createdAt: Date;
  }>;
  dispensaries?: Array<{
    id: string;
    name: string;
    brand: string;
    status: 'active' | 'inactive';
    createdAt: Date;
  }>;
  count?: number;
  error?: string;
}
```

**Use Case:** Mike (CFO) generates customer report → list all 50+ customers with plan info for billing reconciliation

### Tool 11: platform_listPlaybooks
**Purpose:** Get all system-wide automation rules with enabled/disabled status

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  playbooks?: Array<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    steps: number;
    lastModified: Date;
  }>;
  count?: number;
  active?: number;
  error?: string;
}
```

**Use Case:** Leo reviews system automations → see all playbooks, identify which are active for compliance audit

### Tool 12: platform_togglePlaybook
**Purpose:** Enable or disable a system-wide playbook

**Parameters:**
- `playbookId: string` — ID of playbook to toggle
- `active: boolean` — True to enable, false to disable

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Use Case:** Glenda wants to pause marketing campaigns → `platform_togglePlaybook("campaign_automation", false)`

### Tool 13: platform_listFeatureFlags
**Purpose:** Get all beta features and their enabled/disabled status

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  flags?: Record<string, boolean>;
  activeCount?: number;
  error?: string;
}
```

**Example Return:**
```json
{
  "success": true,
  "flags": {
    "loyalty_v2": true,
    "ai_recommendations": false,
    "advanced_analytics": true,
    "team_management_v2": true
  },
  "activeCount": 3
}
```

**Use Case:** Linus (CTO) checks feature status → see which beta features are enabled for users

### Tool 14: platform_toggleFeature
**Purpose:** Enable or disable a beta feature flag

**Parameters:**
- `featureId: string` — ID of feature to toggle
- `enabled: boolean` — True to enable, false to disable

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Use Case:** Glenda wants to enable new loyalty UI for testing → `platform_toggleFeature("loyalty_v2", true)`

### Tool 15: platform_listCoupons
**Purpose:** Get all active coupons with discount information

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  coupons?: Array<{
    id: string;
    code: string;
    discount: number | string;  // percentage or fixed amount
    active: boolean;
    expiresAt: Date;
    usageCount: number;
  }>;
  total?: number;
  active?: number;
  error?: string;
}
```

**Use Case:** Jack (CRO) planning promotion → see current active coupons + usage to avoid conflicts

---

## Module 3: User Administration Tools

### File Location
`src/server/agents/tools/domain/user-admin-tools.ts` (215 lines)

### Tool 16: user_getAll
**Purpose:** List all users with optional filtering by role or lifecycle stage

**Parameters:**
```typescript
{
  role?: string;              // Filter by role (super_user, brand_admin, dispensary, etc.)
  lifecycleStage?: string;    // Filter by stage (prospect, customer, inactive, etc.)
  limit?: number;             // Max records (default: 100)
}
```

**Returns:**
```typescript
{
  success: boolean;
  users?: Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    lifecycleStage: string;
    createdAt: Date;
    lastSignIn?: Date;
  }>;
  total?: number;
  error?: string;
}
```

**Use Case:** Linus audits user base → `user_getAll({ role: "brand_admin" })` to see all brand admins

### Tool 17: user_getPending
**Purpose:** Get users awaiting approval (status: pending)

**Parameters:**
- `limit?: number` — Max records (default: 50)

**Returns:**
```typescript
{
  success: boolean;
  users?: Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: Date;
    appliedReason?: string;
  }>;
  total?: number;
  error?: string;
}
```

**Use Case:** Linus reviews onboarding queue → see 3 pending signups waiting for approval

### Tool 18: user_approve
**Purpose:** Approve a pending user account and activate it

**Parameters:**
- `uid: string` — User ID to approve

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Side Effects:**
- Sets Firestore status to 'active'
- Sets lifecycleStage to 'customer'
- Records approvedAt timestamp

**Use Case:** Linus reviews pending user → `user_approve("abc123def")` → account activated, user can now login

### Tool 19: user_reject
**Purpose:** Reject a pending user account with optional reason

**Parameters:**
- `uid: string` — User ID to reject
- `reason?: string` — Rejection reason (optional)

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Side Effects:**
- Sets Firestore status to 'rejected'
- Sets lifecycleStage to 'rejected'
- Records rejectedAt timestamp + rejectionReason

**Use Case:** Linus rejects suspicious signup → `user_reject("xyz789", "Domain doesn't match industry")`

### Tool 20: user_promote
**Purpose:** Promote a user to an admin or super user role

**Parameters:**
- `uid: string` — User ID to promote
- `newRole: string` — Target role (super_user, super_admin, brand_admin, dispensary_admin)

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Side Effects:**
- Updates Firebase custom claims: `{ role: newRole }`
- Updates Firestore role field
- Records promotedAt timestamp

**Use Case:** Leo wants to promote rishabh@bakedbot.ai to super_user → `user_promote("rishabh_uid", "super_user")` → account gets super user access

---

## Module 4: System Control Tools

### File Location
`src/server/agents/tools/domain/system-control-tools.ts` (169 lines)

### Tool 21: system_getConfig
**Purpose:** Get system configuration overview

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  config?: {
    emailProvider: string;    // 'mailjet', 'sendgrid', etc.
    videoProvider: string;    // 'vimeo', 'youtube', etc.
    aiModel: string;          // 'gpt-4', 'claude-3', etc.
    timezone: string;
    // Plus all custom system config fields
    [key: string]: any;
  };
  error?: string;
}
```

**Use Case:** Glenda checks email config → `system_getConfig` returns that we're using 'mailjet'

### Tool 22: system_setConfig
**Purpose:** Update system configuration values

**Parameters:**
- `updates: Record<string, any>` — Key-value pairs to update

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

**Use Case:** Mike changes timezone → `system_setConfig({ timezone: "America/New_York" })`

### Tool 23: system_listIntegrations
**Purpose:** List all active integrations (POS, payment processors, email, SMS, etc.)

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  integrations?: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive';
    type: string;  // 'pos', 'payment', 'email', 'sms', etc.
    config?: Record<string, any>;
  }>;
  total?: number;
  active?: number;
  error?: string;
}
```

**Use Case:** Linus audits integrations → see all 8+ active integrations (Alleaves, Mailjet, Blackleaf, Slack, etc.)

### Tool 24: system_getAuditLog
**Purpose:** Get recent system audit trail (who did what when)

**Parameters:**
- `limit?: number` — Max records (default: 50, max: 200)

**Returns:**
```typescript
{
  success: boolean;
  logs?: Array<{
    id: string;
    action: string;           // 'create_user', 'update_config', 'approve_campaign'
    actor: string;            // User email who performed action
    resource: string;         // What was affected (user_id, campaign_id, etc.)
    status: 'success' | 'failed';
    timestamp: Date;
    details?: Record<string, any>;
  }>;
  total?: number;
  error?: string;
}
```

**Use Case:** Leo reviews compliance audit → see last 100 actions on system (who approved which campaigns, who changed what config, etc.)

### Tool 25: system_getStats
**Purpose:** Get platform statistics (counts of tenants, users, orders)

**Parameters:** None

**Returns:**
```typescript
{
  success: boolean;
  stats?: {
    tenants: number;
    users: number;
    ordersToday: number;
    timestamp: Date;
  };
  error?: string;
}
```

**Use Case:** Quick metrics check → see we have 47 customers, 156 users, and 23 orders today

### Tool 26: system_clearCache
**Purpose:** Clear application cache (if caching enabled)

**Parameters:**
- `cacheType?: string` — Optional: clear specific cache type (e.g., 'analytics', 'product_catalog')

**Returns:**
```typescript
{
  success: boolean;
  message?: string;
  timestamp?: Date;
  error?: string;
}
```

**Use Case:** Linus debugging stale data issue → `system_clearCache("analytics")` to force refresh

---

## Phase 1 Wiring Fixes

All tools in these 4 modules are properly wired to the runtime via `src/app/dashboard/ceo/agents/default-tools.ts`.

### Pre-existing tools now fixed:
- Context OS (3 tools): contextLogDecision, contextAskWhy, contextGetAgentHistory
- Intuition OS (3 tools): intuitionEvaluateHeuristics, intuitionGetConfidence, intuitionLogOutcome
- CRM (4 tools): crmListUsers, crmGetStats, crmUpdateLifecycle, crmAddNote
- Email (sendEmail alias added)

---

## Usage Patterns

### Pattern 1: Status Check (No Parameters)
```
Leo asks: "What's our system status?"
Agent calls: heartbeat_getStatus()
Returns: Config + current alerts count
```

### Pattern 2: Filtered Listing
```
Linus asks: "Who are our brand admins?"
Agent calls: user_getAll({ role: "brand_admin" })
Returns: List of all brand admins with contact info
```

### Pattern 3: State Change with Confirmation
```
Jack asks: "Approve the pending user marcus@andrewsdevelopments.com"
Agent calls: user_approve("uid_of_marcus")
Side effect: User account activated
Returns: Success message
```

### Pattern 4: Diagnostic Deep Dive
```
Linus asks: "Do we have any system issues?"
Agent calls: heartbeat_diagnose()
Returns: List of issues with severity + recommendations
```

---

## Security Notes

- **Role-based access:** All tools registered with `super_user` role gate in TOOL_REGISTRY
- **No mutation without confirmation:** Tools like `user_reject`, `user_promote`, `platform_togglePlaybook` should be called with explicit user intent (don't auto-call)
- **Real-time data:** All tools query Firestore directly (no caching at tool level), so data is always fresh
- **Audit trail:** `system_getAuditLog` tracks all state-changing actions for compliance

---

## Planned Enhancements (Phase 2)

1. **Tool caching** — Add configurable TTL caching for read-heavy operations (getAnalytics, listTenants, listPlaybooks) to reduce Firestore costs
2. **Real-time streaming** — Make `system_getAuditLog` and `heartbeat_getAlerts` support real-time streaming via WebSockets
3. **Email notifications** — Trigger email alerts when `user_approve` or `user_reject` is called
4. **Cloud Tasks** — Schedule periodic checks via `system_getStats` and `heartbeat_diagnose` with Cloud Tasks

---

## Troubleshooting

### Tool Not Found Error
**Symptom:** Agent responds with `{ error: 'Tool not found' }`
**Cause:** Tool declared in TypeScript schema but not in runtime defaultExecutiveBoardTools
**Fix:** Check `src/app/dashboard/ceo/agents/default-tools.ts` line 150+ for tool wrapper functions

### Firestore Permission Error
**Symptom:** Tool returns `{ success: false, error: 'Missing or insufficient permissions' }`
**Cause:** Firebase service account doesn't have read/write access to collections queried
**Fix:** Check Firebase IAM roles for `bakedbot-backend@studio-567050101-bc6e8.iam.gserviceaccount.com`

### Stale Data
**Symptom:** Tool returns old data even after recent changes
**Cause:** Caching layer in place (Phase 2 planning)
**Fix:** Call `system_clearCache()` to clear and force refresh

---

## Quick Reference Table

| Tool | Module | Role | Parameters | Real-time | Mutates |
|------|--------|------|-----------|-----------|---------|
| heartbeat_getStatus | Heartbeat | Leo | — | Yes | No |
| heartbeat_getHistory | Heartbeat | Leo | limit? | Yes | No |
| heartbeat_getAlerts | Heartbeat | Leo | limit? | Yes | No |
| heartbeat_trigger | Heartbeat | Leo | — | Yes | No |
| heartbeat_configure | Heartbeat | Leo | config | Yes | Yes |
| heartbeat_toggleCheck | Heartbeat | Leo | checkId, enabled | Yes | Yes |
| heartbeat_diagnose | Heartbeat | Leo | — | Yes | No |
| platform_getAnalytics | Platform | Jack | — | Yes | No |
| platform_getHealthMetrics | Platform | Linus | — | Yes | No |
| platform_listTenants | Platform | Mike | — | Yes | No |
| platform_listPlaybooks | Platform | Leo | — | Yes | No |
| platform_togglePlaybook | Platform | Glenda | id, active | Yes | Yes |
| platform_listFeatureFlags | Platform | Linus | — | Yes | No |
| platform_toggleFeature | Platform | Linus | id, enabled | Yes | Yes |
| platform_listCoupons | Platform | Jack | — | Yes | No |
| user_getAll | User Admin | Linus | filters? | Yes | No |
| user_getPending | User Admin | Linus | limit? | Yes | No |
| user_approve | User Admin | Linus | uid | Yes | Yes |
| user_reject | User Admin | Linus | uid, reason? | Yes | Yes |
| user_promote | User Admin | Linus | uid, role | Yes | Yes |
| system_getConfig | System | Any | — | Yes | No |
| system_setConfig | System | Leo | updates | Yes | Yes |
| system_listIntegrations | System | Linus | — | Yes | No |
| system_getAuditLog | System | Leo | limit? | Yes | No |
| system_getStats | System | Any | — | Yes | No |
| system_clearCache | System | Linus | type? | Yes | Yes |

---

## Related Files

- **Tool Definitions:** `.agent/prime.md` → "Super User Agent Tools System" section
- **Memory Notes:** `memory/MEMORY.md` → "Super User Agent Access" section
- **Implementation:** `src/app/dashboard/ceo/agents/default-tools.ts` (integration hub)
- **Source Modules:** `src/server/agents/tools/domain/` (4 files)
