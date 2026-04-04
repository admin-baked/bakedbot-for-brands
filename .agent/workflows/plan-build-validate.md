---
description: "Three-phase workflow: Plan → Build → Validate. Use for any non-trivial feature or change that benefits from structured review before shipping."
---

# Plan → Build → Validate

Structured three-phase workflow for shipping features with confidence. Each phase has a clean context boundary — the output of one phase becomes the input of the next.

## When to Use

- New features touching 3+ files
- Changes to agent behavior, tools, or handoff contracts
- Infrastructure changes (cron jobs, API routes, Firestore schema)
- Anything risk:tier2 or higher

## Phase 1: Plan

**Goal:** Produce a concrete implementation plan before writing any code.

1. Read the relevant source files and types
2. Check `.agent/refs/` for domain documentation
3. Check `.agent/agent-topology.yaml` for affected agents and handoff flows
4. Check `/api/learning-deltas?status=approved` for recent behavior changes that might conflict
5. Produce a plan with:
   - Files to modify (with line ranges)
   - New files to create
   - Types to extend
   - Risk tier classification
   - Failure modes to handle
   - Which agents are affected
6. Get user approval before proceeding

## Phase 2: Build

**Goal:** Implement the plan incrementally, testing after each change.

1. Implement changes file by file
2. Run `npm run check:types` after each file (or batch of related files)
3. If a change affects agent behavior:
   - Update the agent's handoff artifact emission if applicable
   - Update context block builders if OrgProfile fields changed
   - Update `.agent/agent-topology.yaml` if agent capabilities changed
4. If a change affects types:
   - Check all consumers via grep/find-references
   - Ensure backward compatibility (new fields should be optional)
5. Do NOT skip to Phase 3 until the build is green

## Phase 3: Validate

**Goal:** Verify the implementation is correct, complete, and ready to ship.

1. Run `/simplify` — 3-agent parallel review (Reuse, Quality, Efficiency)
2. Fix every confirmed finding
3. Run `npm run check:types` — must pass
4. Run relevant tests if they exist (`npm test -- path/to/file.test.ts`)
5. Verify:
   - [ ] No new `any` types without justification
   - [ ] No `console.log` (use `@/lib/logger`)
   - [ ] Error handling on all async paths
   - [ ] Observability: key decision points are logged
   - [ ] Backward compatible: existing behavior unchanged when new fields are undefined
6. Record with `npm run simplify:record`

## Output

After all three phases, summarize:
- What was planned vs. what was built (any deviations and why)
- Risk tier and failure modes handled
- Files changed
- Ready to commit

## Reference

- `.agent/agent-topology.yaml` — full agent team structure
- `AGENTS.md` — engineering principles and completion check
- `.agent/workflows/simplify.md` — the validation review protocol
