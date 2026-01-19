
# Agent Skills Upgrade Plan

## 1. Review of Anthropic Skills & AgentSkills.io

### What are they?
"Agent Skills" (as defined by Anthropic and agentskills.io) is an emerging standard for packaging agent capabilities.
*   **Structure**: Filesystem-based. A skill is a folder containing a `SKILL.md` (metadata + instructions) and supporting scripts.
*   **Philosophy**: Modular, portable, and self-documenting. Instead of hardcoding tools into an agent's system prompt, you "mount" a skill directory.
*   **Interoperability**: Designed to work with Claude, GitHub Copilot, and other agent runtimes.

### Fit for BakedBot
BakedBot's current architecture:
*   **Personas**: Defined in `personas.ts` with hardcoded `systemPrompt` strings.
*   **Tools**: Defined in `actions.ts` / `router.ts` and referenced by massive string lists (e.g., `['web_search', 'browser_action']`).
*   **Gap**: Adding a new capability requires touching the prompt, the router, and the tool definition separately.

**Upgrade Goal**: Adopt a "Skills-first" architecture where a Skill (e.g., `CannMenusDiscovery`) is a self-contained module that provides *both* the tool logic and the enabling constraints/prompts.

---

## 2. Proposed Architecture

### 2.1 File Structure
Move from `src/server/actions/*` to a modular `src/skills/*` layout:

```text
src/
  skills/
    core/
      browser/
        SKILL.md      # "You can use the browser to..."
        index.ts      # export const tools = [...]
      search/
        SKILL.md
        index.ts
    domain/
      cannmenus/
        SKILL.md      # "Use this to find product availability..."
        index.ts      # export const searchRetailers = ...
      leaflink/
      metrc/
```

### 2.2 The `Skill` Interface
We will define a TypeScript interface that mirrors the physical structure:

```typescript
interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string; // From SKILL.md
  tools: ToolDefinition[]; // Function definitions compatible with Vercel AI SDK / Genkit
}
```

### 2.3 Router Update
Update `runAgentChat` to:
1.  Resolve the Persona.
2.  Load the assigned **Skills**.
3.  Inject (`System Prompt` + `Skill Instructions`).
4.  Register (`Skill Tools`) in the dispatcher.

---

## 3. Implementation Steps

### Phase 1: Foundation
- [ ] Create `src/skills/` directory structure.
- [ ] Define `Skill` types in `src/server/agents/skills/types.ts`.
- [ ] Create a `SkillLoader` service to read `SKILL.md` + `index.ts`.

### Phase 2: Migration (Pilot)
- [x] Port **"Web Search"** to `src/skills/core/search`.
- [x] Port **"CannMenus"** to `src/skills/domain/cannmenus`.
- [x] Update `Smokey` persona to use `skills: ['core/search', 'domain/cannmenus']`.

### Phase 3: Router Integration
- [x] Update `src/server/agents/agent-runner.ts` (formerly actions.ts) to dynamically compose prompt.

### Phase 4: Productivity (Live)
- [x] Port **"Calendar"**, **"Sheets"**, **"Scheduler"** to `core/productivity`.
- [x] Update `Puff` & `Pops`.

### Phase 5: Integration Expansion (Live)
- [x] Port **"Dutchie"** (`domain/dutchie`).
- [x] Port **"LeafLink"** (`domain/leaflink`).
- [x] Update `Pops`, `Money Mike`, `Ezal`.

### Phase 6: Tasklet-style Automation (Live)
- [x] Port **"Slack"** (`domain/slack`).
- [x] Port **"Drive"** (`core/drive`).
- [x] Port **"Codebase"** (`core/codebase`).
- [x] Update `Puff` & `Deebo`.

### Phase 7: Anthropic-inspired Power Tools (Future)
- [ ] Port **"Terminal"** (`core/terminal`) for `Deebo` (System Diagnostics).
- [ ] Port **"Analysis"** (`core/analysis`) for `Pops` (Data REPL).
- [ ] Update `Deebo` and `Pops` personas.
- [x] Port **"Core Email"** (`src/skills/core/email`).
- [x] Port **"Core Browser"** (`src/skills/core/browser`) - [ ] Verify with Linus/Builder
- [x] Update `Craig` & `Puff` personas.
- [ ] mechanism to import third-party skills from `agentskills.io`.

---

## 4. Immediate Next Step
Begin **Phase 1**: Define the interface and scaffold the first skill.
