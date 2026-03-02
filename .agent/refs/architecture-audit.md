# BakedBot Agent Architecture Audit

> **Date:** 2026-03-02
> **Scope:** Full architecture audit mapped against the OpenClaw agent framework
> **Branch:** `claude/audit-agent-architecture-xeErA`

---

## Executive Summary

BakedBot's agent architecture is **significantly more sophisticated** than OpenClaw in several dimensions (multi-agent specialization, memory hierarchy, security), but shares the same fundamental building blocks. This audit maps BakedBot's architecture to the four canonical zones of agent design — **Triggers, Context Injection, Tools, and Outputs** — and identifies concrete risks around context rot, memory fragmentation, and overhead bloat.

**Key Finding:** BakedBot already implements the "sniper agent" pattern (specialized agents with domain-specific tools) that the OpenClaw analysis recommends as the fix for generalist overhead. However, the system has accumulated complexity that introduces its own form of context rot risk.

---

## 1. Architecture Mapping: OpenClaw Framework → BakedBot

### Zone 1: What Triggers the Agent

| Trigger Type | OpenClaw | BakedBot | Assessment |
|---|---|---|---|
| **User message** | Telegram/Discord gateway | Next.js API routes → `agent-runner.ts` | Equivalent |
| **Heartbeat** | 30-min default timer | Cloud Scheduler → `/api/cron/heartbeat` (5-min) | BakedBot's is more frequent, configurable per-tenant/role |
| **Cron jobs** | Agent-modifiable cron expressions | **45 Cloud Scheduler jobs** via `/api/cron/*` | Far more extensive than OpenClaw |
| **Webhooks** | External events wake agent | `/api/webhooks/*` (Alleaves POS, error reports) | Equivalent |
| **Agent Bus** | N/A | `agent-bus.ts` — inter-agent message queue in Firestore | BakedBot advantage: multi-agent coordination |
| **Sleep-time** | N/A | `sleeptime-agent.ts` — triggered every 5 messages for background consolidation | Unique to BakedBot |

**Assessment:** BakedBot has a richer trigger system than OpenClaw with 45 cron endpoints, a heartbeat system, agent-to-agent messaging, and webhook handlers. The risk is operational complexity — each cron job is an independent Next.js route that must be individually maintained and monitored.

### Zone 2: What Gets Injected into Context

| Context Layer | OpenClaw | BakedBot | Assessment |
|---|---|---|---|
| **System prompt** | `soul.md` + personality files | `buildSystemPrompt()` in `claude.ts` with `AgentContext` (name, role, capabilities, grounding rules, super powers) | BakedBot's is structured and role-specific |
| **Conversation history** | JSONL file → messages array | Two separate systems: Letta conversations + Firestore agent memory | **Fragmented** — see Risk #1 |
| **Tool schemas** | JSON schemas injected on every turn | Zod schemas → `zodToClaudeSchema()` conversion | Equivalent |
| **Memory/RAG** | `memory.md` + hybrid retrieval | Letta blocks (in-context) + archival search (out-of-context) + Firestore KB | More sophisticated but largely disconnected — see Risk #2 |
| **Goal directives** | N/A | `goal-directive-builder.ts` — injects top 3 active org goals into system prompt | Unique advantage |
| **Agent roster** | N/A | `buildSquadRoster()` — formatted agent list for delegation awareness | Unique to multi-agent system |
| **Integration status** | N/A | `buildIntegrationStatusSummary()` — grounds agents on what's actually available | Good anti-hallucination pattern |
| **Capability reminder** | N/A | `buildCapabilityReminder()` — injected every 4 iterations to prevent context dilution | Proactive context rot mitigation |

### Zone 3: What Tools the Agent Can Call

| Tool Category | OpenClaw | BakedBot | Assessment |
|---|---|---|---|
| **Communication** | Via computer control | 14 tool files (SMS/Blackleaf, Email/Mailjet, WhatsApp, Gmail) | Purpose-built, more reliable than screen-scraping |
| **Browser** | Chrome extension relay | RTRVR service + browser-tools.ts | Similar approach |
| **Memory** | Read/write `memory.md`, RAG search | 6 Letta tools (save fact, ask, search, update core, message agent, read shared block) | More structured |
| **Context OS** | N/A | 3 tools (log decision, ask why, get agent history) | Decision audit trail — unique advantage |
| **Intuition OS** | N/A | 3 tools (evaluate heuristics, get confidence, log outcome) | System 1/System 2 routing |
| **Domain tools** | Generic computer control | 40+ specialized tools across analytics, campaigns, CRM, compliance, discovery, SEO, profitability, scheduling | **Sniper agent** tools |

**Tool count per agent path:**

| Agent | Tools Available | Est. Schema Tokens |
|---|---|---|
| OpenClaw (generalist) | 15 tools | ~3,000 |
| Linus (CTO) | ~25 tools (codebase + deployment + shared) | ~5,000 |
| Craig (Marketing) | ~12 tools (campaigns + shared) | ~2,400 |
| Smokey (Budtender) | ~10 tools (products + recommendations + shared) | ~2,000 |
| Leo (COO) | ~15 tools (delegation + orchestration + shared) | ~3,000 |
| Agent Runner chat path | 0 tools (Genkit generate, no tool use) | 0 |

**Assessment:** BakedBot correctly implements the "sniper agent" pattern — each agent gets only the tools relevant to its domain. This is superior to OpenClaw's kitchen-sink approach. The exception is the `openclaw.ts` agent, which replicates OpenClaw's generalist pattern with 15 tools.

### Zone 4: What the Agent Outputs

| Output Channel | OpenClaw | BakedBot | Assessment |
|---|---|---|---|
| **Chat response** | Single-channel (Telegram/Discord) | Multi-channel (web dashboard, Slack, email, SMS) | More versatile |
| **Memory writes** | `memory.md` file | Letta blocks, Firestore docs, procedural memory | More structured but fragmented |
| **Tool results** | Back to model in loop | Back to model in loop (`executeWithTools` in `claude.ts`) | Equivalent |
| **Telemetry** | N/A | `agent-telemetry.ts` — records model, tokens, latency, tool executions | Observability advantage |
| **Audit trail** | N/A | `agent-events.ts` — logs to global event stream per Intuition OS | Compliance advantage |
| **Slack notifications** | N/A | Heartbeat, build monitor, and morning briefing post to Slack | Operations advantage |

---

## 2. Agentic Loop Comparison

### OpenClaw Loop
```
User → LLM → Tool Call → Execute → Result → LLM → ... → Response
```
Simple linear loop. Single model. JSONL history. Max iterations implicit.

### BakedBot Loop (3 execution paths)

**Path A: Agent Runner (primary chat)**
```
User → routeToAgent() [keyword scoring] → runAgentCore()
     → Genkit/Gemini generate (NO tool calling) → Response
```
This is a **single-shot generation** — no agentic loop at all in the primary chat path. The model generates a response and returns.

**Path B: Harness (background agents)**
```
Trigger → loadState() → initialize() → orient() → act()
       → [LLM plans → tool call → execute → result → LLM] × N
       → persist memory → log event → Response
```
This is the true agentic loop, with OODA-style phases and dependency injection.

**Path C: Multi-step Task (hybrid model)**
```
User → Gemini 2.5 Flash (PLAN) → Tool selection
     → Execute tool (with HITL check) → Collect result
     → [Repeat until COMPLETE/BLOCKED/maxIterations]
     → Claude Sonnet 4.5 (SYNTHESIZE final response)
```
This is a novel **dual-model agentic loop** — Gemini for fast planning, Claude for synthesis.

### Assessment
BakedBot's harness is architecturally superior to OpenClaw's simple loop:
- **OODA phases** (Orient → Act) prevent aimless tool calling
- **HITL checkpoints** for high-risk tools (sendSms, createPlaybook, etc.)
- **PEI drift detection** catches when the agent loops on the same tool 3+ times
- **Validation hooks** (pre/post tool execution) with auto-remediation
- **Canary tokens** detect system prompt extraction attempts
- **Dual-model routing** uses cheaper models for planning, expensive models for reasoning

---

## 3. Context Overhead Analysis

### BakedBot Fixed Context Overhead (per request)

**Path A: Agent Runner (chat)**

| Component | Est. Tokens | Notes |
|---|---|---|
| Agent persona system prompt | ~500 | Static per agent from `PERSONAS` config |
| Custom instructions block | ~200 | Tenant-specific AI settings |
| User context block | ~100 | Brand name, city, state |
| Knowledge base (top-3 docs) | ~1,500 | Cosine similarity > 0.65 |
| Goal directives | ~300 | Top 3 active goals |
| User message | Variable | — |
| **Total fixed overhead** | **~2,600** | **Very lean** |

**Path B: Harness (multi-step with Claude)**

| Component | Est. Tokens | Notes |
|---|---|---|
| System prompt (`buildSystemPrompt`) | ~400 | Agent identity + capabilities + grounding rules |
| Super powers block | ~500 | 11 script descriptions |
| Tool schemas (Claude format) | ~2,000-5,000 | Varies by agent (sniper design) |
| User query (sanitized) | Variable | — |
| Step history (grows per iteration) | ~200/step | Capped at `maxIterations` (default 5) |
| Capability reminder (every 4 turns) | ~100 | Anti-context-dilution |
| **Total fixed overhead** | **~3,400-6,400** | **Healthy range** |

**Path C: OpenClaw agent**

| Component | Est. Tokens | Notes |
|---|---|---|
| OPENCLAW_SYSTEM_PROMPT | ~800 | Full persona + capability listing |
| 15 tool schemas | ~3,000 | All communication, browser, memory, task tools |
| Context info | ~50 | Tenant/user IDs |
| **Total fixed overhead** | **~3,850** | **Moderate — matches OpenClaw's Day 1 overhead** |

### Growth Risk Over Time

| System | Day 1 | 6 Months | Risk Level |
|---|---|---|---|
| Agent Runner chat | ~2,600 | ~2,600 (static) | LOW — no memory accumulation |
| Harness agents | ~5,000 | ~5,000 (per-run state) | LOW — state loaded/saved per run |
| OpenClaw agent | ~3,850 | ~3,850 (no growing state) | LOW — but no learning either |
| Letta memory blocks | 0 (unused in chat) | ~8,000 (block caps) | MEDIUM — appended but tail-truncated |
| Firestore agent memory | Variable | **UNBOUNDED** | **HIGH** — see Risk #3 |

---

## 4. Critical Risks Identified

### Risk #1: Memory System Fragmentation (Severity: HIGH)

BakedBot has **three separate memory systems** that don't interoperate:

1. **Letta memory** (blocks + archival + episodic + procedural) — fully implemented as a service layer but **not wired into the primary chat path** (`agent-runner.ts` imports nothing from Letta)
2. **Firestore agent memory** — used by the harness path, has no size limits
3. **Knowledge base** — separate Firestore vector store used by agent runner

**Impact:** A customer talking to Smokey gets zero benefit from Letta memory. Heartbeat insights stored in Letta blocks are never retrieved during chat. Procedural memory (learned workflows) is never consulted for similar future tasks.

**Recommendation:**
- Wire Letta `lettaSearchMemory()` into the `agent-runner.ts` context injection pipeline
- Add a memory retrieval step before response generation: `const memories = await lettaClient.searchPassages(agentId, userMessage, 3)`
- Or consolidate on one system — Firestore KB + Firestore agent memory may be sufficient without Letta

### Risk #2: Letta Block Overflow (Severity: MEDIUM)

`appendToBlock()` in `block-manager.ts` silently drops the oldest content when a block exceeds 8,000 chars:
```typescript
const trimmedValue = newValue.length > block.limit
    ? newValue.slice(-block.limit + 500)  // Keep tail, drop head
    : newValue;
```

No summarization occurs. Heartbeat appends daily. Executive workspace will overflow within weeks.

**Recommendation:**
- Before truncating, summarize the to-be-dropped content via Gemini Flash and store the summary as an archival passage
- Add a `truncations_count` metric to detect when this is happening

### Risk #3: Unbounded Firestore Agent Memory (Severity: MEDIUM)

Agent memory documents in Firestore (`tenants/{brandId}/agents/{agentName}/data/memory`) have no size constraints. An `EzalMemory` with growing `competitor_watchlist` and `menu_snapshots` arrays will grow indefinitely.

**Recommendation:**
- Add max-length constraints to array fields in agent memory schemas
- Implement a retention policy: keep only the last N entries for time-series data
- Add document size monitoring in the `collect-metrics` cron

### Risk #4: OpenClaw Agent is a Generalist Anti-Pattern (Severity: LOW)

The `openclaw.ts` agent replicates the exact generalist pattern the video critiques — 15 tools covering communication, browser automation, memory, and task management all in one agent. While its fixed overhead is manageable (~3,850 tokens), it violates the sniper agent principle that the rest of the codebase follows.

**Recommendation:**
- Either integrate OpenClaw's unique capabilities (WhatsApp, Calendar, Tasks) into existing sniper agents
- Or restrict OpenClaw to a clear scope (e.g., personal assistant tasks only, no overlap with Craig's email or Smokey's recommendations)

### Risk #5: Primary Chat Has No Agentic Loop (Severity: MEDIUM)

The `agent-runner.ts` path — which handles all real-time user chat — uses a **single-shot Genkit generate call with no tool use**. This means:
- Agents cannot call tools during chat (no SMS sending, no web search, no memory saves)
- Agents cannot verify their own outputs
- The harness's sophisticated OODA/HITL/PEI/validation infrastructure is unused for chat

**Recommendation:**
- Evaluate migrating the chat path to `executeWithTools()` from `claude.ts`, at least for premium agents like Linus, Leo, and Puff
- Even a `maxIterations: 2` setting would allow tool-augmented chat

### Risk #6: 45 Cron Jobs = Operational Fragility (Severity: LOW-MEDIUM)

Each cron job is a separate Cloud Scheduler → Next.js route. With 45 cron endpoints:
- Monitoring is distributed (no unified cron dashboard)
- Auth is duplicated in each route handler
- Failure in one job is silent unless it hits the heartbeat-recovery path

**Recommendation:**
- Consolidate related cron jobs (e.g., the 5 `generate-insights-*` routes could be one route with a type parameter)
- Add a unified cron health dashboard that checks Cloud Scheduler job statuses

---

## 5. Strengths vs. OpenClaw

| Dimension | BakedBot Advantage |
|---|---|
| **Sniper agents** | 19 specialized agents vs. 1 generalist |
| **Security** | Canary tokens, prompt sanitization, HITL gates, input protection |
| **Memory hierarchy** | 5-layer memory system (core blocks, archival, episodic, procedural, associative) |
| **Observability** | Agent telemetry, event logging, PEI drift detection |
| **Multi-model** | Gemini Flash for planning, Claude Sonnet for tools, Claude Opus for strategy |
| **Context hygiene** | Capability reminders, grounding rules, integration status injection |
| **Autonomous behavior** | 45 cron jobs, heartbeat system, sleep-time consolidation |
| **Safety** | Validation hooks, HITL checkpoints, auto-remediation |

---

## 6. Recommendations Summary

| Priority | Action | Impact |
|---|---|---|
| **P0** | Wire Letta memory search into `agent-runner.ts` chat path | Unblocks the entire memory system for real users |
| **P1** | Add summarization to `appendToBlock()` truncation | Prevents silent knowledge loss |
| **P1** | Evaluate tool-use capability in agent runner chat path | Enables agentic chat (the core value proposition) |
| **P2** | Add size limits to Firestore agent memory documents | Prevents unbounded growth |
| **P2** | Consolidate or scope the OpenClaw generalist agent | Aligns with sniper agent architecture |
| **P3** | Consolidate related cron jobs | Reduces operational surface area |
| **P3** | Add unified cron health monitoring | Improves reliability visibility |

---

## 7. Architecture Diagram

```
                        ┌──────────────────────────┐
                        │      TRIGGER ZONE         │
                        │                          │
                        │  User Chat ─────────────┐│
                        │  45 Cron Jobs ──────────┤│
                        │  Webhooks ──────────────┤│
                        │  Heartbeat (5min) ──────┤│
                        │  Agent Bus ─────────────┤│
                        │  Sleep-Time Agent ──────┘│
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │    ROUTING & INJECTION    │
                        │                          │
                        │  Agent Router ──► Keyword │
                        │  scoring → AgentId       │
                        │                          │
                        │  Context Assembly:        │
                        │  • System prompt (persona)│
                        │  • Goal directives        │
                        │  • Tool schemas           │
                        │  • Knowledge base (RAG)   │
                        │  • Integration status     │
                        │  • Capability reminder    │
                        │  • ⚠️ Letta = disconnected│
                        └────────────┬─────────────┘
                                     │
            ┌────────────────────────┼────────────────────┐
            │                        │                    │
   ┌────────▼───────┐    ┌──────────▼─────────┐   ┌─────▼──────────┐
   │  Agent Runner  │    │     Harness        │   │  Multi-Step    │
   │  (Chat Path)   │    │  (Background)      │   │  (Hybrid)      │
   │                │    │                    │   │                │
   │  Genkit/Gemini │    │  OODA Loop:        │   │  Gemini: Plan  │
   │  Single-shot   │    │  Init → Orient →   │   │  Execute Tools │
   │  NO tools      │    │  Act (with tools)  │   │  Claude: Synth │
   │  ⚠️ No loop    │    │  → Persist         │   │  HITL + PEI    │
   └────────┬───────┘    └──────────┬─────────┘   └──────┬─────────┘
            │                        │                    │
            └────────────────────────┼────────────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │      OUTPUT ZONE          │
                        │                          │
                        │  Chat Response            │
                        │  Slack Notifications      │
                        │  SMS/Email (via tools)    │
                        │  Memory Writes            │
                        │  Telemetry Events         │
                        │  Audit Trail              │
                        │  Procedural Memory        │
                        └──────────────────────────┘
```

---

## Appendix: File Inventory

| Area | Files | Total Lines |
|---|---|---|
| Agent implementations | 32 files in `src/server/agents/` | 15,697 |
| Tool definitions | 40 files in `src/server/tools/` | 8,702 |
| Memory services (Letta) | 18 files in `src/server/services/letta/` | 5,764 |
| Cron endpoints | 45 directories in `src/app/api/cron/` | ~4,500 est. |
| AI wrappers | `src/ai/claude.ts` + `src/ai/genkit.ts` | ~700 |
| **Total agent infrastructure** | **~135+ files** | **~35,000+ lines** |
