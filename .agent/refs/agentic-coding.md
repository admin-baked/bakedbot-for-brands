# Agentic Coding Reference

## Overview
Best practices for AI agents working in this codebase. This is for agents like Claude Code and Linus.

---

## Core Rules

### 1. Build Health is Priority Zero
```powershell
npm run check:types
```
If failing, stop everything and fix it. No exceptions.

### 2. Read Before Write
Never modify code you haven't read. Use the Read tool first.

### 3. Small Changes, Frequent Tests
One logical change → test → repeat. Don't batch large changes.

### 4. Plan Complex Work
Multi-file changes need a written plan and user approval before executing.

### 5. Archive Decisions
Record *why* you made choices, not just what you changed. Use `archive_work`.

---

## Decision Framework

### When to Just Do It
- Single file fix
- Clear bug with obvious solution
- User gave explicit instructions
- Build is passing, change is small

### When to Plan First
- 3+ files affected
- New feature or subsystem
- Unclear requirements
- Architectural changes
- Anything involving auth/payments/compliance

### When to Ask User
- Multiple valid approaches
- Missing requirements
- Could affect production data
- Unsure about existing patterns

---

## Workflow Templates

### Bug Fix
```
1. Reproduce: Understand the bug
2. Read: Load the relevant file(s)
3. Fix: Make minimal change
4. Test: npm test -- path/to/file.test.ts
5. Verify: npm run check:types
6. Commit
```

### New Feature
```
1. Health Check: npm run check:types
2. Research: query_work_history for related code
3. Read Refs: Load relevant .agent/refs/ files
4. Plan: Write implementation steps
5. Approve: Get user sign-off
6. Execute: One step at a time, test after each
7. Archive: archive_work with decisions
8. Commit
```

### Refactor
```
1. Tests First: Ensure tests exist and pass
2. Read: Understand current implementation
3. Plan: Describe target state
4. Incremental: Small changes, test after each
5. Verify: All tests still pass
6. Archive: Document reasoning
```

---

## Context Management

### Hierarchy (Most → Least Important)
1. **CLAUDE.md** — Always loaded, project-wide rules
2. **.agent/prime.md** — Agent startup context
3. **Refs on demand** — Load only when working in that area
4. **File contents** — Read what you're about to change
5. **Work history** — Check before modifying

### When to Load Refs
| Working On | Load First |
|------------|------------|
| Agent code | `refs/agents.md` |
| Auth/session | `refs/authentication.md` |
| API routes | `refs/api.md` |
| UI components | `refs/frontend.md` |
| Testing | `refs/testing.md` |
| External APIs | `refs/integrations.md` |
| Memory/Letta | `refs/bakedbot-intelligence.md` |

### Context Window Hygiene
- Don't load all refs at once
- Use `/clear` between unrelated tasks
- Summarize long outputs
- Sub-agents for isolated research

---

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Edit without reading | Read file first |
| Make 10+ file changes at once | Small increments |
| Skip build check | `npm run check:types` before/after |
| Guess at patterns | Read refs or existing code |
| Use `console.log` | Use `logger` from `@/lib/logger` |
| Use `any` type | Use `unknown` or specific type |
| Forget to test | Test after every change |
| Skip archiving | `archive_work` after significant changes |

---

## Code Quality Checklist

Before committing, verify:

- [ ] `npm run check:types` passes
- [ ] Relevant tests pass
- [ ] No `console.log` statements (use logger)
- [ ] No `any` types (use `unknown` or specific)
- [ ] Error handling with try/catch
- [ ] Server mutations use `'use server'`
- [ ] No hardcoded secrets
- [ ] Input validation on user input

---

## Testing Strategy

### Run Tests
```powershell
# All tests
npm test

# Specific file
npm test -- path/to/file.test.ts

# Pattern match
npm test -- --testPathPattern="agents"
```

### Test Coverage Goals
| Type | Target |
|------|--------|
| Unit | 80%+ for business logic |
| Integration | Critical paths |
| E2E | Happy paths |

### Test-Driven Approach
1. Write failing test
2. Implement to pass
3. Refactor
4. Repeat

---

## Security Guidelines

### Always Check
- [ ] No hardcoded secrets/API keys
- [ ] Input validation on user input
- [ ] Auth checks on protected routes
- [ ] Sanitize output (prevent XSS)
- [ ] No SQL/NoSQL injection vectors
- [ ] Error messages don't leak internals

### Sensitive Areas
- `src/server/actions/` — Server mutations
- `src/app/api/` — API routes
- Auth/session code — Extra scrutiny
- Payment code — Maximum caution

---

## Related Files
- `CLAUDE.md` — Project context
- `.agent/prime.md` — Agent startup
- `refs/testing.md` — Testing patterns
- `refs/agents.md` — Agent architecture
