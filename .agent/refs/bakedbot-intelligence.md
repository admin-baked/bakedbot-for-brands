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
- **Procedural Learning** — Successful workflows are remembered and reused
- **Background Consolidation** — Sleep-time agents distill insights asynchronously

---

## Memory Engineering Framework

Based on **Richmond Alake's Memory Hierarchy** (from the Deep Learning AI course):

| Memory Type | Human Brain | Letta Equivalent | BakedBot Implementation |
|-------------|-------------|------------------|-------------------------|
| **Working Memory** | Active context | Memory Blocks | `lettaBlockManager` |
| **Episodic Memory** | Conversations, experiences | Conversation Search | `episodicMemoryService` |
| **Semantic Memory** | Facts, knowledge | Archival Memory | `letta_search_memory` |
| **Procedural Memory** | Skills, routines | (Custom) | `proceduralMemoryService` |
| **Associative Memory** | Pattern recall | Graph edges | `associativeMemoryService` |

---

## The Letta Memory Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT WINDOW                            │
│  ┌─────────────┐   ┌─────────────────────────────────────┐  │
│  │ System      │   │ Core Memory (In-Context Blocks)     │  │
│  │ Prompt      │   │ - brand_context                     │  │
│  │             │   │ - agent_leo_memory                  │  │
│  │             │   │ - compliance_policies (read-only)   │  │
│  └─────────────┘   └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              (semantic/temporal search on demand)
                              │
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL MEMORY (Out-of-Context)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Semantic   │  │  Episodic   │  │    Procedural       │ │
│  │  (Archival) │  │(Conversation│  │ (Workflow Memory)   │ │
│  │  - Facts    │  │   Search)   │  │ - Tool trajectories │ │
│  │  - Knowledge│  │  - History  │  │ - Success patterns  │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
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
| `src/server/services/letta/index.ts` | Unified exports |
| `src/server/services/letta/client.ts` | Letta Cloud API wrapper |
| `src/server/services/letta/block-manager.ts` | Shared block CRUD |
| `src/server/services/letta/memory-types.ts` | Memory schemas & types |
| `src/server/services/letta/episodic-memory.ts` | Conversation search |
| `src/server/services/letta/procedural-memory.ts` | Workflow trajectories |
| `src/server/services/letta/sleeptime-agent.ts` | Background consolidation |
| `src/server/services/letta/associative-memory.ts` | Graph-based memory relationships |
| `src/server/services/letta/memory-bridge.ts` | Letta ↔ Firestore sync |
| `src/server/services/letta/conversations.ts` | Parallel conversation threads |
| `src/server/services/letta/archival-tags.ts` | Tag-based memory organization |
| `src/server/tools/letta-memory.ts` | Agent tools for memory (15 tools) |

---

## Agent Tools

### Semantic Memory (Facts & Knowledge)
| Tool | Description |
|------|-------------|
| `letta_save_fact` | Save a fact to archival memory |
| `letta_search_memory` | Semantic search across memory |
| `letta_ask` | Ask the memory system a question |
| `letta_update_core_memory` | Update agent's persona/human blocks |

### Shared Memory (Working Memory)
| Tool | Description |
|------|-------------|
| `letta_read_shared_block` | Read a shared memory block |
| `letta_message_agent` | Send async message to another agent |

### Episodic Memory (Conversations)
| Tool | Description |
|------|-------------|
| `letta_search_conversations` | Search past conversations with date filters |
| `letta_get_recent_context` | Get recent messages for context resumption |

### Procedural Memory (Workflows)
| Tool | Description |
|------|-------------|
| `letta_find_workflow` | Find successful past workflows |
| `letta_get_best_practice` | Get best practice for tool combinations |

### Associative Memory (Graph)
| Tool | Description |
|------|-------------|
| `letta_find_related_memories` | Find memories connected to a given memory |
| `letta_link_memories` | Create relationship between two memories |

### Archival Tags (Organization)
| Tool | Description |
|------|-------------|
| `letta_save_with_tags` | Save content with tags for organization |
| `letta_search_by_tags` | Filter search by tags |
| `letta_suggest_tags` | Get tag suggestions for content |

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

## Sleep-Time Architecture

Sleep-time agents run in the background to consolidate memory:

```typescript
// Automatic trigger after N messages
if (sleepTimeService.shouldTrigger(agentId)) {
    await sleepTimeService.runConsolidation(agentId, tenantId);
}

// Manual scheduled consolidation (e.g., from cron)
await runScheduledConsolidation(tenantId);
```

**What it does:**
1. Gathers recent conversation history
2. Distills key insights using Gemini (fast, cost-effective)
3. Updates memory blocks with synthesized learnings
4. Archives important facts for long-term storage

Reference: [Letta Sleep-Time Docs](https://docs.letta.com/guides/agents/architectures/sleeptime)

---

## Memory Weighting Algorithm

Based on Stanford's "Generative Agents" paper, we score memories by:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Relevance** | 0.5 | Semantic similarity (RRF score from Letta) |
| **Recency** | 0.3 | Exponential decay (1 week half-life) |
| **Importance** | 0.2 | Cross-reference count |

```typescript
const finalScore =
    relevance * 0.5 +
    recencyDecay(timestamp) * 0.3 +
    importance * 0.2;
```

---

## Associative Memory (Graph)

Build knowledge graphs by connecting related memories:

```typescript
// Link two memories
await associativeMemoryService.createEdge({
    fromMemoryId: 'mem-123',
    toMemoryId: 'mem-456',
    relation: 'similar_to',
    strength: 0.8,
    createdBy: 'ezal',
    tenantId: 'brand123'
});

// Find related memories
const related = await associativeMemoryService.findRelated(
    'mem-123',
    tenantId,
    { relations: ['similar_to', 'followed_by'], minStrength: 0.5 }
);

// Find path between memories
const path = await associativeMemoryService.findPath(
    'mem-123',
    'mem-789',
    tenantId,
    maxHops: 3
);
```

**Relation Types:**
- `similar_to` - Semantically related content
- `followed_by` - Temporal sequence
- `caused` - Causal relationship
- `referenced_in` - Cross-reference
- `contradicts` - Conflicting information
- `supersedes` - Newer info replaces old

---

## Memory Bridge (Letta ↔ Firestore)

Sync data between Letta (agent memory) and Firestore (product/business data):

```typescript
// Sync strategic context to Firestore (for RAG access)
await memoryBridgeService.syncStrategicContextToFirestore(tenantId);

// Sync business metrics to Letta (for executive agents)
await memoryBridgeService.syncBusinessMetricsToLetta(tenantId);

// Unified search across both systems
const results = await memoryBridgeService.unifiedSearch(tenantId, query, {
    agentId,
    includeFirestore: true,
    includeLetta: true
});
```

---

## Archival Tags

Organize memories with a consistent tagging taxonomy:

**Tag Prefixes:**
- `category:` - Topic (competitor, product, customer)
- `agent:` - Who created (ezal, craig, linus)
- `priority:` - Importance (high, low)
- `status:` - State (verified, pending)

```typescript
// Save with tags
await archivalTagsService.insertWithTags(agentId, {
    content: "Competitor X lowered prices by 10%",
    tags: ['category:competitor', 'category:pricing', 'priority:high'],
    tenantId
});

// Search by tags
const results = await archivalTagsService.searchByTags(agentId,
    ['category:competitor'],
    { query: 'price', requireAllTags: true }
);
```

---

## Related Documentation
- [Letta Official Docs](https://docs.letta.com)
- [Letta Multi-Agent Shared Memory](https://docs.letta.com/guides/agents/multi-agent-shared-memory/)
- [Letta Sleep-Time Architecture](https://docs.letta.com/guides/agents/architectures/sleeptime)
- [Letta Archival Search](https://docs.letta.com/guides/agents/archival-search/)
- [Letta Conversations](https://docs.letta.com/guides/agents/conversations)
- `refs/tools.md` — Agent tools including memory
- `refs/context-os.md` — Decision lineage (uses archival memory)
