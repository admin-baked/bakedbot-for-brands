# Agent Domain Memory System

## Overview
The Domain Memory system normalizes how BakedBot agents persist state, make decisions, and execute actions. Each agent has a dedicated "memory" document and follows a strict lifecycle harness.

## Architecture

### 1. Data Models (`src/server/agents/schemas.ts`)
We use Zod schemas to enforce structure.
- **BrandDomainMemory**: Shared state (Objectives, Constraints).
- **AgentMemory**: Private state per agent.
- **AgentLogEntry**: Append-only log of actions.

### 2. The Harness (`src/server/agents/harness.ts`)
All agents run through `runAgent(...)` which enforces:
1.  **Initialize**: Repair/Hydrate memory.
2.  **Orient**: Select a target task.
3.  **Act**: Perform work.
4.  **Update**: Persist changes.

### 3. Deebo SDK (`src/server/agents/deebo.ts`)
Compliance is provided as a middleware SDK.
```ts
const compliance = await deebo.checkContent('IL', 'sms', 'Get 20% off!');
if (compliance.status === 'fail') { ... }
```

## Agents
- **Craig**: Marketing Automation (Campaigns).
- **Smokey**: AI Budtender (Rec Policies, UX).
- **Pops**: Business Intelligence (Hypotheses).
- **Ezal**: Competitive Intelligence (Gaps).
- **Money Mike**: Pricing (Experiments).
- **Mrs. Parker**: Loyalty (Journeys).

## Dev Workflow
AI Agents building this repo use `dev/backlog.json` to track their own features, following the same memory pattern as the production agents.
