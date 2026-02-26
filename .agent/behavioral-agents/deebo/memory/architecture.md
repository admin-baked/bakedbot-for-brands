# Deebo — System Architecture

> Chief Compliance Officer, "The Shield". Persona ID: `deebo`.
> Source: `src/server/agents/deebo.ts`

---

## Role

Deebo is the **Chief Compliance Officer** for cannabis marketing. He provides
zero-tolerance compliance checking for all agent-generated content before dispatch.
Deebo is not an inbox-first agent — he is called programmatically by other agents
(Craig, Creative Larry, Campaign Carlos) as a gating function.

Deebo does not have a full `initialize()` / `orient()` / `act()` harness like Smokey
and Craig. Instead, he exposes a module-level `deebo` SDK object with three core methods.

---

## Two-Path Compliance Check

Deebo uses a **fast-path then slow-path** architecture:

```
deebo.checkContent(jurisdiction, channel, content)
  │
  ├── 1. Regex fast-path (synchronous, no LLM cost)
  │      loadRulePack(jurisdiction, channel)
  │      for each rule with type === 'regex':
  │          new RegExp(rule.pattern, 'i').test(content)
  │      if violations found → return 'fail' immediately (skip LLM)
  │
  └── 2. LLM semantic fallback (Gemini 2.5 Pro via Genkit)
         Only runs if regex passes (no obvious violations)
         Prompt: per-state channel rules + general prohibitions + required disclosures
         Model: 'googleai/gemini-2.5-pro'
         Output schema: ComplianceResultSchema { status, violations, suggestions }
         On error → return 'fail' with system error message (fail-safe)
```

The regex fast-path is critical for performance. A BOGO promotion with "cure your pain"
gets rejected in microseconds without an LLM call.

---

## deebo SDK

```typescript
export const deebo = {
    // Fetch the active rule pack for a jurisdiction+channel
    async getRulePack(jurisdiction, channel): Promise<RulePack | null>

    // Check content for compliance violations (regex + LLM)
    async checkContent(jurisdiction, channel, content): Promise<ComplianceResult>

    // Check marketing channel compliance (structural first, then LLM)
    async checkMarketingCompliance(stateCode, channel, contentDescription):
        Promise<ComplianceResult & { verdict: string; citations: string[] }>
}
```

### checkMarketingCompliance() vs checkContent()

| Function | When to Use |
|----------|-------------|
| `checkContent(state, channel, content)` | Direct content text — full copy, SMS body, email text |
| `checkMarketingCompliance(state, channel, description)` | Campaign intent/description — "we want to run a 420 promo on TikTok" |

`checkMarketingCompliance` runs a structural channel-level check first (is this channel
even allowed in this state?) before doing content analysis. Uses `structuralMarketingCheck()`
from `src/server/data/state-marketing-rules.ts`.

---

## Standalone Compliance Helpers

These are exported alongside the `deebo` SDK for use by other modules:

```typescript
// Age check — deterministic, no LLM
export function deeboCheckAge(dob: Date | string, jurisdiction: string)
    → { allowed: boolean, reason?: string, minAge: 21 }

// State shipping check — deterministic, no LLM
export function deeboCheckStateAllowed(state: string)
    → { allowed: boolean, reason?: string }

// Checkout compliance — stub, returns allowed: true
export function deeboCheckCheckout(cart: any)
    → { allowed: boolean, violations: [], warnings: [], errors: [] }

// State compliance block for agent system prompt injection
export function getStateComplianceBlock(stateCode: string): string

// Legacy wrapper for other modules
export async function deeboCheckMessage({ orgId, channel, stateCode, content })
    → { ok: boolean, reason: string }
```

`deeboCheckAge()` and `deeboCheckStateAllowed()` are **deterministic** — no LLM, no async.
This makes them ideal for the golden set's `function` test type (fast, always run, no API cost).

---

## Rule Packs

### RulePackService.getRulePack(jurisdiction, channel)

```typescript
static async getRulePack(jurisdiction: string, channel: string): Promise<RulePack | null> {
    const packs = {
        'WA:retail': waRetailRules,    // src/server/agents/rules/wa-retail.json
        'NY:retail': nyRetailRules,    // src/server/agents/rules/ny-retail.json
        'CA:retail': caRetailRules,    // src/server/agents/rules/ca-retail.json
        'IL:retail': ilRetailRules,    // src/server/agents/rules/il-retail.json
    };

    // Try exact channel match: 'NY:sms' → 'NY:retail' fallback
    if (key in packs) return packs[key];
    const retailKey = `${jurisdiction}:retail`;
    if (retailKey in packs) return packs[retailKey];

    // Unmapped jurisdiction: return empty rule pack (LLM handles semantic checks)
    return { jurisdiction, channel, version: 1, status: 'passing', rules: [] };
}
```

**Channel fallback**: If `NY:sms` has no pack, it falls to `NY:retail`. This means
retail rules are the baseline for all channels. SMS/email-specific rule packs would
only be added if there are channel-specific rules beyond the retail baseline.

**Unmapped jurisdictions**: States not in the packs (MA, CO, NJ, WA, OR, MI) return an
empty rule pack — LLM-only semantic check. This is a known gap (see patterns.md).

---

## Current Rule Packs

| File | Jurisdiction | Channel | Rules |
|------|-------------|---------|-------|
| `ny-retail.json` | NY | retail | 15 regex rules (v2) |
| `ca-retail.json` | CA | retail | 5-6 regex rules |
| `il-retail.json` | IL | retail | 5-6 regex rules |
| `wa-retail.json` | WA | retail | 5-6 regex rules |

### NY v2 Rule Pack (ny-retail.json)

The most comprehensive. 15 regex rules covering:
1. Medical claims ("cure", "treat", "prevent", "heal")
2. Non-addictive claims
3. Unqualified safety claims
4. Free cannabis (NY §134 prohibition)
5. Wellness/therapy framing
6. Glorifying intoxication
7. Alcohol comparison
8. Under-21 proximity claims
9. Youth platform ads (TikTok)
10. False FDA claims
11. Guaranteed effects
12-15. Additional state-specific prohibitions

---

## State Compliance Data Layer

Beyond rule packs, Deebo uses a separate state marketing rules layer:

```typescript
import { getStateMarketingRules, buildStateComplianceBlock } from '@/server/data/state-marketing-rules';
```

This provides per-channel allowed/blocked status, audience composition requirements,
required disclosures, and regulatory citations. Used in the LLM semantic check prompt
to give the model precise channel-level context.

`buildStateComplianceBlock(stateCode)` formats this as a system prompt injection block
for other agents (Smokey, Craig can call this to get compliance context in their prompts).

---

## Regulation Monitor

The regulation monitor is a separate cron service, not part of `deebo.ts` itself:

```
POST /api/cron/regulation-monitor (weekly, every Sunday)
  1. Fetch regulation source URLs from regulation-sources.json
  2. For each source: fetch current content
  3. SHA-256 hash current content vs stored hash
  4. If diff detected:
     a. Claude Haiku: generate proposed rule pack changes
     b. Save proposal to Drive (category: 'documents')
     c. Post Slack alert with proposed changes
  5. NEVER auto-modify rule packs
  6. Store new hash to regulation_snapshots Firestore collection
```

The monitor ONLY proposes changes — a human must review and manually update the JSON
rule pack files and redeploy. This is intentional: compliance rule changes require
human review before taking effect.

---

## State Compliance Matrix (Phase 4)

Deebo has a per-state compliance matrix wired in via `src/server/data/state-marketing-rules.ts`.
States covered: NY, MA, CA, CO, IL (Phase 4, commit `77f692ac`).

Each state entry includes:
- `stateName` — full name for prompt context
- `channels{}` — per-channel rules: `allowed`, `condition`, `audienceCompositionRequired`, `prohibitedContent`, `requiredDisclosures`, `citations`
- `generalProhibitions[]` — universal rules for the state
- `licenseTypes[]` — applicable license types

---

## ComplianceResult Schema

```typescript
const ComplianceResultSchema = z.object({
    status: z.enum(['pass', 'fail', 'warning']),
    violations: z.array(z.string()),
    suggestions: z.array(z.string()),
});
```

`warning` status means content has potential issues but is not an automatic fail.
Callers should surface warnings to the user for review.

---

## RulePack Schema

```typescript
const RulePackSchema = z.object({
    jurisdiction: z.string(),
    channel: z.string(),
    version: z.number(),
    rules: z.array(z.any()),   // flexible — rules can have any fields
    status: z.enum(['passing', 'failing', 'deprecated']),
});
```

`rules: z.array(z.any())` is intentional — rule packs can have extra fields
(`flags`, `severity`, `example_violation`) without breaking the schema.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server/agents/deebo.ts` | Core SDK: checkContent, checkMarketingCompliance, age/state helpers |
| `src/server/agents/rules/ny-retail.json` | NY v2 rule pack (15 rules) |
| `src/server/agents/rules/ca-retail.json` | CA rule pack |
| `src/server/agents/rules/il-retail.json` | IL rule pack |
| `src/server/agents/rules/wa-retail.json` | WA rule pack |
| `src/server/agents/rules/regulation-sources.json` | Source URLs for regulation monitor |
| `src/server/data/state-marketing-rules.ts` | Per-channel state marketing rules |
| `src/app/api/cron/regulation-monitor/route.ts` | Regulation monitor cron |
| `.agent/golden-sets/deebo-compliance.json` | 23 golden set cases (100% required) |
