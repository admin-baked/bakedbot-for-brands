# Agent Incident Runbooks

> Operational runbooks for diagnosing and resolving AI agent failures.
> Updated: 2026-02-25 | Owner: Linus (CTO)

---

## Incident 1: Agent Returns Hallucinated Tool Calls

**Symptoms:** Claude calls a tool name that doesn't exist in `LINUS_TOOLS` (or equivalent). The executor throws "Unknown tool" errors. Agent may loop retrying the same hallucinated tool.

**Root Cause:**
- System prompt doesn't carry tool list → Claude guesses tool names
- Agent context not injected (missing `agentContext` in ClaudeContext)
- Long conversation has diluted the tool definitions

**Resolution:**
1. Check that the agent's `agentContext` is being passed to `executeWithTools()`
2. Verify `buildSystemPrompt()` is rendering the capabilities block
3. Check the iteration count — if > 8, the capability reminder should have fired at iteration 4 and 8
4. If the hallucinated tool name is close to a real tool, consider adding it as an alias in the executor
5. Increase the reminder frequency: reduce `REMINDER_INTERVAL` in `claude.ts`

**Prevention:** Ensure all agents pass `agentContext` with a `capabilities` list that matches their actual tool names.

---

## Incident 2: Agent in Infinite Loop

**Symptoms:** Agent hits `maxIterations` (default 10, Linus 15) without producing a final response. Token costs spike. Latency exceeds 2 minutes.

**Root Cause:**
- Agent keeps calling tools in a cycle without making progress
- Tool returns ambiguous output that triggers another tool call
- `stop_reason` never reaches `'end_turn'`

**Resolution:**
1. Check telemetry: `agent_telemetry` collection for the agent, filter by high `toolCallCount`
2. Look at the tool call sequence — is the same tool being called repeatedly with identical inputs?
3. Check if the tool executor is returning errors that Claude interprets as "try again"
4. Reduce `maxIterations` for the specific caller (Slack context → 8, API → 10)
5. Add a deduplication check: if the same tool+input appears 3x, inject a "you've already tried this" message

**Prevention:** Monitor `toolCallCount` in telemetry. Alert if any invocation exceeds 12 tool calls.

---

## Incident 3: Agent Cost Spike

**Symptoms:** Daily agent cost exceeds budget ($50/day default). Single invocation costs > $5. Opus model being selected for routine tasks.

**Root Cause:**
- Auto-routing selecting Opus 4.5 for tasks that don't need it
- Very long prompts (CLAUDE.md is ~2000+ tokens) inflating input costs
- Agent conversations growing too long (each iteration adds to message history)

**Resolution:**
1. Check telemetry: filter by `costEstimateUsd > 1.0` to find expensive invocations
2. Check `_model` field — is Opus being selected? Check the `complexity.reasoning` log
3. If Opus is being over-selected, tighten the patterns in `OPUS_PATTERNS` in `claude.ts`
4. Consider truncating `CLAUDE.md` injection for routine tasks (Linus already reads it every invocation)
5. For long conversations, consider message pruning (keep system prompt + last N messages)

**Prevention:**
- Set up Cloud Monitoring alert for daily cost > $50
- Review model routing patterns weekly via telemetry aggregation
- Consider caching `CLAUDE.md` content to avoid re-reading on every invocation

---

## Incident 4: Agent Ignoring Super Powers

**Symptoms:** Agent spends 10+ tool calls manually investigating an issue that a super power script could solve in 1 call (e.g., running 5 `read_file` + `search_codebase` calls instead of `npm run audit:schema`).

**Root Cause:**
- `agentContext.superPowers` not included in system prompt
- Super powers section buried too deep in context (before prime.md restructure)
- Capability reminder not firing (conversation too short for interval)
- Agent doesn't understand when to use `execute_super_power` vs individual tools

**Resolution:**
1. Verify `agentContext` includes `superPowers` string
2. Check `buildSystemPrompt()` output — does it include "SUPER POWERS" section?
3. Check telemetry: `capabilityUtilization` metric — is it < 0.10?
4. If agent has been running for < 4 iterations, the reminder hasn't fired yet → reduce `REMINDER_INTERVAL`
5. Consider adding explicit routing hints: "For schema issues, use execute_super_power with script=audit-schema"

**Prevention:**
- Monitor `capabilityUtilization` trend in telemetry
- If consistently < 0.10, the prompt engineering needs revision
- Add `execute_super_power` to the grounding rules as a first-resort tool

---

## Incident 5: Agent Quality Degradation

**Symptoms:** Agent responses are less accurate, less helpful, or failing eval scores. Users report that "Linus used to be better at this."

**Root Cause:**
- Prompt change introduced regression
- Model version change (Anthropic updated the model)
- Context pollution from new system prompt content
- Grounding data (CLAUDE.md, prime.md) has become stale or contradictory

**Resolution:**
1. Run golden set evals against the affected agent:
   - Linus: no dedicated golden set yet (create one)
   - Smokey: `npm test -- smokey-qa` against `smokey-qa.json`
   - Craig: `npm test -- craig-campaigns` against `craig-campaigns.json`
   - Deebo: `npm test -- deebo-compliance` against `deebo-compliance.json`
2. Compare scores to last known good baseline
3. If scores dropped after a specific commit, `git bisect` to find the regression
4. Check if model version changed: compare `_model` in telemetry across dates
5. Review system prompt changes in git history: `git log -p -- src/ai/claude.ts`

**Prevention:**
- Run evals before AND after any prompt change
- Block merges if eval scores drop > 5%
- Store baseline scores in `.agent/golden-sets/baselines.json`

---

## Incident 6: Cross-Agent Communication Failure

**Symptoms:** `delegate_to_agent` tool returns errors. Linus can't dispatch tasks to Craig, Smokey, or other agents. Harness orchestration breaks.

**Root Cause:**
- Target agent not registered in `harness.ts`
- Target agent's dependencies unavailable (missing API key, Firestore down)
- Circular delegation (Agent A delegates to B which delegates back to A)

**Resolution:**
1. Check `src/server/agents/harness.ts` — is the target agent registered?
2. Check the target agent's initialization — does it have required env vars?
3. Check Firestore connectivity: `getAdminFirestore()` working?
4. Check for circular delegation in telemetry: filter by `toolCalls.name = 'delegate_to_agent'`
5. Test the target agent directly (bypass delegation) to isolate the issue

**Prevention:**
- Add health checks for each agent's dependencies at startup
- Log delegation chains in telemetry to detect cycles
- Set max delegation depth (default: 2 hops)

---

## Escalation Path

| Severity | Response Time | Notification |
|----------|--------------|--------------|
| **P0** — Agent down in production, user-facing | < 5 min | Slack #linus-incidents → auto-escalate to human |
| **P1** — Agent degraded, partial functionality | < 30 min | Slack #infrastructure → Linus auto-dispatched |
| **P2** — Agent working but suboptimal | Next business day | QA bug filed → backlog |
| **P3** — Cosmetic / minor quality issue | Sprint planning | Backlog item |

---

## Quick Diagnostic Commands

```bash
# Check agent telemetry for last 24 hours
# (Run via Firestore console or admin script)

# Check if Linus is responding
curl -X POST https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/agents/linus \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"prompt": "health check"}'

# Check build health (most common root cause)
npm run check:types

# Check all agent dependencies
npm run audit:consistency

# View recent agent errors in Cloud Logging
# Filter: severity>=ERROR AND jsonPayload.message=~"AgentTelemetry"
```
