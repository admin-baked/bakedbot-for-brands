# Deebo — Patterns & Gotchas

> Recurring patterns, known pitfalls, and rule pack authoring conventions.
> Read before modifying rule packs, adding new states, or touching the compliance engine.

---

## Rule Pack Authoring

### rules: z.array(z.any()) — Extra Fields Are Safe

```typescript
const RulePackSchema = z.object({
    rules: z.array(z.any()),  // flexible
});
```

The schema accepts any fields on individual rules. Adding `flags`, `severity`,
`example_violation`, or `citations` to rule objects is safe:

```json
{
    "type": "regex",
    "pattern": "\\bcure\\b",
    "description": "Medical claim: 'cure'",
    "severity": "critical",
    "example_violation": "Our flower cures anxiety",
    "citations": ["NY PHL §3393(1)"]
}
```

These extra fields are ignored by the regex engine but useful for documentation
and future tooling. The golden set eval runner also uses `description` for error messages.

### Deebo Hardcodes 'i' Flag — The 'flags' Field Is Documentation Only

```typescript
// deebo.ts line 96 (approximately)
const re = new RegExp(rule.pattern, 'i');  // 'i' flag ALWAYS applied
```

Deebo hardcodes case-insensitive matching regardless of any `flags` field in the rule JSON.
If you add a `flags` field to a rule, it is documentation only — Deebo ignores it.

This is intentional: cannabis content violations should always be case-insensitive.
"CURE", "Cure", and "cure" are equally prohibited.

### Regex Pattern Escaping

In JSON, backslashes must be doubled. Word boundary `\b` in regex becomes `\\b` in JSON:

```json
{ "pattern": "\\bcure\\b" }         → tests: /\bcure\b/i
{ "pattern": "\\btreat\\b" }        → tests: /\btreat\b/i
{ "pattern": "clinically\\s+proven" } → tests: /clinically\s+proven/i
```

Test your patterns with `new RegExp(pattern, 'i').test(content)` in a Node REPL before
adding them to rule packs. A broken regex causes the rule to silently never match.

### Step Syntax in Comments: Space Required

```
✅ "* /5 * * * *"   (space before /) — safe in comments and JSDoc
❌ "*/5 * * * *"    (no space)       — terminates JSDoc block comment
```

The cron schedule for regulation monitor is `0 0 * * 0` (weekly Sunday midnight).
This is safe because it doesn't use step syntax. But if you ever document a cron with
step syntax (`*/15 * * * *`) in a `/** ... */` JSDoc block, add a space: `"* /15 * * * *"`.

---

## Regulation Monitor Invariants

### NEVER Auto-Modify Rule Packs

The regulation monitor is read-only with respect to rule packs. The flow is:

```
detect change → generate PROPOSAL → save to Drive → Slack alert → STOP
```

It never writes to `src/server/agents/rules/*.json`. A human must:
1. Review the Drive document with proposed changes
2. Edit the JSON file manually
3. Commit and deploy via `git push origin main`

This is a hard architectural invariant. The moment the monitor auto-applies rule changes,
compliance becomes non-deterministic and audit trails break.

### regulation_snapshots Collection

The monitor stores content hashes (not full text) in `regulation_snapshots` Firestore collection.
Schema:
```
{
    sourceId: string,       // key from regulation-sources.json
    url: string,
    contentHash: string,    // SHA-256 of fetched content
    lastCheckedAt: Timestamp,
    changeDetectedAt?: Timestamp,
    proposalDriveFileId?: string,
}
```

Cannot diff text from this collection — only knows IF content changed, not what changed.
The Claude Haiku proposal uses the NEW content only (fetched fresh on detection).

---

## callClaude() vs deebo.checkContent()

When Deebo uses the LLM path, it calls Genkit's `ai.generate()` — NOT `callClaude()`:

```typescript
// deebo.ts — LLM path uses Genkit
const result = await ai.generate({
    prompt: prompt,
    model: 'googleai/gemini-2.5-pro',
    output: { schema: ComplianceResultSchema }
});
```

`callClaude()` is used by other services (brand-guide enricher, regulation monitor proposals,
morning briefing). Deebo itself uses Genkit + Gemini for content compliance checks.

If you add a new compliance check that needs an LLM call, use Genkit's `ai.generate()`
pattern — NOT the Claude SDK directly. This keeps Deebo's LLM tier consistent and
allows model swaps in one place.

### callClaude() Takes a Single Options Object

If you do need to call Claude from compliance-adjacent code:

```typescript
// CORRECT
await callClaude({
    systemPrompt: '...',
    userMessage: content,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
});

// WRONG — positional args don't exist
await callClaude(systemPrompt, userMessage, model, maxTokens);
```

---

## DriveCategory Must Be 'documents' (Plural)

When saving regulation proposals to Drive:

```typescript
await saveToDrive({
    orgId,
    fileName: `regulation-proposal-${sourceId}-${date}.md`,
    content: proposal,
    category: 'documents',   // ← plural, NOT 'document'
    mimeType: 'text/markdown',
});
```

`DriveCategory` values: `'documents'`, `'reports'`, `'images'`, `'campaigns'`, `'templates'`.
Singular `'document'` is NOT a valid value — will throw at runtime.
Source: `src/types/drive.ts`.

---

## deeboCheckAge() and deeboCheckStateAllowed() Are Deterministic

These two functions contain NO Firestore reads, NO LLM calls, NO async operations:

```typescript
export function deeboCheckAge(dob: Date | string, jurisdiction: string) {
    const birthDate = new Date(dob);
    const ageDifMs = Date.now() - birthDate.getTime();
    // ... pure date arithmetic ...
    return { allowed: age >= 21, minAge: 21 };
}

export function deeboCheckStateAllowed(state: string) {
    const blocked = ['ID', 'NE', 'KS'];
    return blocked.includes(state)
        ? { allowed: false, reason: '...' }
        : { allowed: true };
}
```

This is why the golden set uses `test_type: 'function'` for these cases — they run
in the fast eval tier (no API cost, <2s). If you add new deterministic checks, document
them as function tests in the golden set.

---

## Unmapped States: LLM-Only Fallback

States not in the rule pack map (MA, CO, NJ, OR, MI) return an empty rule pack:

```typescript
return { jurisdiction, channel, version: 1, status: 'passing', rules: [] };
```

This means ALL compliance checking for these states is LLM-only (Gemini). The
eval runner will log a `NOTE` (not a failure) when regex tests are skipped:

```
⚠️  deebo-002-ma-medical-claim    No regex rules for MA/retail — LLM fallback in prod. Rerun with --full.
```

This is a known and accepted gap — priority is to add MA and CO rule packs next
since they are the two largest regulated markets after NY and CA.

---

## Fail-Safe: Always Return 'fail' on Error

```typescript
} catch (error) {
    logger.error('[Deebo] Genkit Error:', { ... });
    return {
        status: 'fail',
        violations: ['Compliance check failed due to system error.'],
        suggestions: ['Retry later.']
    };
}
```

When the LLM call fails, Deebo fails CLOSED (returns 'fail', blocks dispatch) rather
than failing open (allowing potentially non-compliant content through). This is intentional.

The only case where Deebo's failure would block legitimate content is if Gemini is down.
This is acceptable — compliance cannot be weakened to accommodate uptime issues.

---

## Golden Set: deebo-compliance.json

Location: `.agent/golden-sets/deebo-compliance.json`

- 23 test cases, split by `test_type`:
    - `function`: age check + state allowed check (deterministic, always run)
    - `regex`: fast-path regex rule tests (run without LLM)
    - `llm`: semantic compliance tests (require `--full` mode)

- Threshold: **100% across ALL categories** — zero tolerance
- Categories: `age_verification`, `state_shipping`, `medical_claims`, `minors_protection`, `content_review`

### Compliance-Critical Cases

All 23 cases in `deebo-compliance.json` are compliance-critical. There is no grace
threshold — a single failure in any case is a compliance failure that blocks commit.

This is documented in the eval runner:

```javascript
if (totalComplianceFails > 0) {
    console.error(`FAILED — ${totalComplianceFails} compliance-critical failure(s). DO NOT COMMIT.`);
    process.exit(1);
}
```

Run: `node scripts/run-golden-eval.mjs --agent deebo`           (fast: function + regex)
Run: `node scripts/run-golden-eval.mjs --agent deebo --full`    (all: includes LLM tests)

---

## Common Mistakes

| Mistake | Correct Pattern |
|---------|----------------|
| Adding `flags` field expecting Deebo to use it | `flags` is doc-only; Deebo always uses `'i'` flag |
| Using singular `'document'` in DriveCategory | Always use plural `'documents'` |
| Calling `callClaude()` from Deebo for LLM checks | Use Genkit `ai.generate()` with `googleai/gemini-2.5-pro` |
| Assuming `*/5` in JSDoc comments is safe | Use `"* /5"` (space) in `/** */` blocks to avoid comment termination |
| Auto-applying regulation changes | Regulation monitor ONLY proposes — human must review and deploy |
| Returning 'pass' on LLM error | Always return 'fail' on error — fail closed, not open |
| Adding states without both rule packs AND golden set cases | New states need: JSON rule pack + golden set `regex` cases + `llm` cases |
