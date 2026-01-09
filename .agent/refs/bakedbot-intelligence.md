# BakedBot Intelligence Reference

## Overview
**BakedBot Intelligence** is our unified agent memory and learning system. It enables agents to remember, learn, and collaborate in real-time.

Powered by **Letta** (formerly MemGPT), an open-source framework for building stateful AI agents.

---

## Core Philosophy

> "Agents that remember are agents that learn."

Traditional LLMs are stateless — each conversation starts fresh. BakedBot Intelligence gives our agents:
- **Persistent Memory** — Facts learned survive across sessions
- **Shared Context** — Agents share knowledge in real-time (Hive Mind)
- **Long-Term Learning** — Archival memory with semantic search

---

## The Letta Memory Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW                            │
│  ┌─────────────┐   ┌─────────────────────────────────────┐  │
│  │ System      │   │ Core Memory (In-Context Blocks)     │  │
│  │ Prompt      │   │ - brand_context                     │  │
│  │             │   │ - agent_leo_memory                  │  │
│  │             │   │ - compliance_policies               │  │
│  └─────────────┘   └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              (semantic search on demand)
                              │
┌─────────────────────────────────────────────────────────────┐
│              ARCHIVAL MEMORY (Out-of-Context)               │
│  Millions of entries • Customer histories • Decision logs   │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Types

### 1. Shared Memory Blocks (Hive Mind)
**The Killer Feature**: When one agent updates a block, ALL agents see it instantly.

| Block | Purpose | Visibility |
|-------|---------|------------|
| `brand_context` | Brand profile, goals, competitive intel | Brand agents |
| `dispensary_context` | Location, inventory, compliance status | Dispensary agents |
| `customer_insights` | Segments, top products, loyalty | Customer agents |
| `executive_workspace` | Strategic plans, KPIs, delegation notes | Executive only |
| `compliance_policies` | Regulatory rules (read-only) | All agents |
| `playbook_status` | Active automations, last run | Brand/Dispensary |

**Example**: Mike (CFO) cuts budget → updates `executive_workspace` → Craig (CMO) instantly sees the constraint and adjusts campaigns.

### 2. Agent-Specific Memory
Each agent has private memory for their domain:

| Block Label | Agent | Purpose |
|-------------|-------|---------|
| `agent_leo_memory` | Leo (COO) | Tasks, decisions, team status |
| `agent_craig_memory` | Craig (CMO) | Campaigns, audiences, calendar |
| `agent_ezal_memory` | Ezal | Competitors, alerts, price changes |
| `agent_linus_memory` | Linus (CTO) | Commits, PRs, codebase insights |
| `agent_mrsparker_memory` | Mrs. Parker | VIPs, onboarding queue, loyalty |

### 3. Archival Memory
Long-term storage via semantic search. Scales to millions of entries.

**Use Cases**:
- Customer conversation history
- Decision traces (Context OS)
- Document repositories
- Training materials

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/server/services/letta/client.ts` | Letta Cloud API wrapper |
| `src/server/services/letta/block-manager.ts` | Shared block CRUD |
| `src/server/services/letta/customer-agent-manager.ts` | Per-customer agents |
| `src/server/services/letta/dynamic-memory.ts` | Dynamic memory allocation |
| `src/server/services/letta/role-permissions.ts` | Block access control |
| `src/server/tools/letta-memory.ts` | Agent tools for memory |

---

## Agent Tools

| Tool | Description |
|------|-------------|
| `letta_save_fact` | Save a fact to archival memory |
| `letta_search_memory` | Semantic search across memory |
| `letta_update_personal_memory` | Update agent's private block |
| `letta_read_shared_block` | Read a shared block |
| `letta_write_shared_block` | Write to a shared block |

### Usage Example
```typescript
// In agent flow
await tools.letta_save_fact({
  fact: "Customer John prefers indica strains for sleep",
  category: "customer_preference"
});

const results = await tools.letta_search_memory({
  query: "What does John prefer?",
  limit: 5
});
```

---

## Configuration

**Environment Variables**:
```env
LETTA_API_KEY=your-api-key
LETTA_BASE_URL=https://api.letta.com/v1
```

See `apphosting.yaml` for secret configuration.

---

## Related Documentation
- [Letta Official Docs](https://letta.com/docs)
- `refs/tools.md` — Agent tools including memory
- `refs/context-os.md` — Decision lineage (uses archival memory)
