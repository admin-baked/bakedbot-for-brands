# Boardroom Bob — Patterns & Gotchas

## Critical Rules

### Rule 1: getCRMUserStats() and getPlatformUsers() must share inference logic
```typescript
// ✅ CORRECT — stats derived from the same user list
async function getCRMUserStats(orgId: string) {
  const users = await getPlatformUsers(orgId);  // single source of truth
  return {
    total: users.length,
    paying: users.filter(u => u.lifecycle === 'paying').length,
    trial:  users.filter(u => u.lifecycle === 'trial').length,
  };
}

// ❌ WRONG — separate inference logic causes Jack 25→0 bug
async function getCRMUserStats(orgId: string) {
  const snapshot = await db.collection('users').where('orgId', '==', orgId).get();
  const paying = snapshot.docs.filter(d => d.data().lifecycleStage === 'paying').length;
  // Firestore raw lifecycleStage defaults to 'prospect' — diverges from getPlatformUsers()
}
```

### Rule 2: Trial detection uses orgMemberships, not orgId presence
```typescript
// ✅ CORRECT — org membership check
const isTrial = Object.keys(user.orgMemberships ?? {}).length > 0 && !user.subscription;

// ❌ WRONG — caused ALL users with any orgId to be 'trial'
const isTrial = !!user.orgId || !!resolvedOrgId;  // '|| resolvedOrgId' kills it
```

### Rule 3: BriefingMetric.vsLabel is required
```typescript
// ✅ CORRECT — always include vsLabel
metrics.push({
  label: 'MRR',
  value: formatCurrency(mrr),
  change: mrrChange,
  changeType: mrrChange >= 0 ? 'up' : 'down',
  vsLabel: 'vs last month',  // ← REQUIRED — TypeScript error if missing
});

// ❌ WRONG — vsLabel missing causes TS error in morning-briefing.ts
metrics.push({
  label: 'MRR',
  value: formatCurrency(mrr),
  change: mrrChange,
  changeType: 'up',
  // missing vsLabel — TS2322: Type ... is not assignable to BriefingMetric
});
```

### Rule 4: getBugs() and getQAReport() return data directly
```typescript
// ✅ CORRECT — use result directly
const bugs = await getBugs(orgId);           // QABug[]
const report = await getQAReport(orgId);     // QAReport

// ❌ WRONG — no wrapper object
const { data: bugs } = await getBugs(orgId);    // TypeScript error
const { success, data } = await getQAReport();  // undefined
```

### Rule 5: Morning briefing uses singleton thread
```typescript
// ✅ CORRECT — find or create the persistent briefing thread
const existingThread = await db.collection(`tenants/${orgId}/inbox_threads`)
  .where('metadata.isBriefingThread', '==', true)
  .limit(1)
  .get();

const threadId = existingThread.empty
  ? await createBriefingThread(orgId)  // creates once, reused forever
  : existingThread.docs[0].id;

await postMessageToThread(threadId, briefingMessage);

// ❌ WRONG — creates new thread every day = inbox flood
await createNewThread({ metadata: { isBriefingThread: true }, ... });
```

### Rule 6: Use svh not vh for boardroom height
```tsx
// ✅ CORRECT — stable viewport height (no jump on mobile)
<div className="xl:h-[calc(100svh-200px)]">

// ❌ WRONG — jumps when mobile browser address bar hides
<div className="xl:h-[calc(100vh-200px)]">
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Jack shows 25 users, CRM shows 0 (or vice versa) | Two separate lifecycle inference functions | `getCRMUserStats()` must call `getPlatformUsers()` |
| All users classified as 'trial' | `|| resolvedOrgId` in trial check | Remove `|| resolvedOrgId` — check orgMemberships only |
| TypeScript error on BriefingMetric push | Missing `vsLabel` field | Always include `vsLabel: 'vs last period'` |
| Morning briefing floods inbox with new threads | Thread created daily instead of reused | Find thread by `metadata.isBriefingThread = true` first |
| Chat canvas too tall, input below fold | Using `100vh` | Switch to `100svh` |
| Boardroom chat input not visible on mobile | Height overflow | Use `xl:h-[calc(100svh-200px)]` + `xl:flex-1 xl:min-h-0` combo |
| Linus incident analysis takes 7+ min | `maxIterations: 15` | Use `maxIterations: 5` for auto-escalation |
| `FinancialBenchmarks` type errors | Wrong field names | Use `discountRateNationalAvg` not `discountRate`; `competitionDensity` not `priceEnvironment` |

---

## FinancialBenchmarks & MarketContext Field Reference

```typescript
// FinancialBenchmarks — correct field names:
interface FinancialBenchmarks {
  discountRateNationalAvg: number;   // NOT discountRate
  discountRateTarget: number;
  grossMarginTarget: number;
  // NOT: avgBasketSize, salesVelocity, etc.
}

// MarketContext — correct field names:
interface MarketContext {
  stateCode: string;
  licenseType: 'limited' | 'unlimited' | 'unknown';
  marketMaturity: 'early' | 'developing' | 'mature';
  competitionDensity: 'low' | 'medium' | 'high';  // NOT priceEnvironment
}
```

---

*Patterns version: 1.0 | Created: 2026-02-26*
