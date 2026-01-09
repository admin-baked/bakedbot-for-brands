# Agentic Coding Reference

## Overview
Best practices for AI-powered coding agents, including rules, workflows, and evaluation frameworks.

---

## Core Philosophy

> "Plan first, code second. Review always."

AI coding agents are powerful **pair programmers**, not autonomous replacements for human developers.

### The Golden Rules

1. **Human-in-the-Loop** — Always review generated code
2. **Plan Before Execute** — Create detailed plan, then implement
3. **Incremental Development** — Small changes, frequent tests, regular commits
4. **Context is King** — Well-structured context = quality output
5. **Fail Fast** — Test early, catch errors early

---

## CLAUDE.md Best Practices

The `CLAUDE.md` file is the "permanent brain" for your project.

### What to Include

| Category | Examples |
|----------|----------|
| **Code Style** | "Use ES modules, not CommonJS", "Functional components with hooks" |
| **Common Commands** | `npm run test`, `npm run build`, `npm run check:types` |
| **Testing Instructions** | "Run tests before committing", coverage requirements |
| **Project Structure** | Key directories, utilities, patterns |
| **Repository Etiquette** | Branch naming, merge vs rebase |
| **Developer Environment** | Node version, required tools |

### Best Practices

1. **Keep it Concise** — Less is more. Universal content only.
2. **Progressive Disclosure** — Point to task-specific files (e.g., `refs/testing.md`)
3. **Avoid Single-Task Instructions** — Don't clutter with one-off tasks
4. **Check into Git** — Share across team and sessions
5. **Use `.local.md` for Personal** — `CLAUDE.local.md` for personal settings (gitignored)

---

## Agentic Workflow

### The Plan-Execute Loop

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PLAN      │────▶│   REVIEW    │────▶│   EXECUTE   │
│             │     │   (Human)   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       └───────────────────────────────────────┘
                    (Iterate)
```

### Steps

1. **Orient** — Understand the request fully
2. **Plan** — Generate detailed implementation plan
3. **Review** — Human reviews and approves plan
4. **Execute** — Implement in small increments
5. **Test** — Run tests after each change
6. **Commit** — Commit frequently for easy rollback
7. **Iterate** — Repeat until complete

### Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Jump straight to coding | Plan first, get approval |
| Make massive changes | Small, incremental changes |
| Skip testing | Test after every change |
| Ignore context | Read CLAUDE.md and refs |
| Guess at requirements | Ask clarifying questions |

---

## Context Management

### Context Window Hygiene

- **Clear between tasks**: Use `/clear` to reset context
- **Progressive disclosure**: Load detailed refs only when needed
- **Sub-agents**: Use for complex, isolated subtasks
- **Keep prompts focused**: One clear goal per interaction

### Context Sources (Priority Order)

1. **CLAUDE.md** — Always loaded, project-wide context
2. **Refs Directory** — Detailed documentation on demand
3. **Current Files** — Active working context
4. **Conversation History** — Recent exchanges

---

## Code Evaluation Framework

### Industry Benchmarks

| Benchmark | Focus | Use Case |
|-----------|-------|----------|
| **HumanEval** | Basic coding (Pass@k) | Algorithm implementation |
| **SWE-bench** | Real GitHub issues | Bug fixing ability |
| **SWE-bench Verified** | Human-validated | Reliable evaluation |
| **AgentBench** | Multi-dimensional | OS, databases, web |
| **LiveCodeBench** | Updated problems | Prevents contamination |

### Key Metrics

| Metric | Description |
|--------|-------------|
| **Pass@k** | ≥1 of k samples passes all tests |
| **Compilation Success** | Code compiles without errors |
| **Functional Correctness** | Correct output for test cases |
| **Code Quality** | Linter scores, complexity |
| **Security** | No vulnerabilities detected |

### BakedBot's 7-Layer Framework (Linus)

| Layer | Agent | Focus | Industry Equivalent |
|-------|-------|-------|---------------------|
| 1 | Architect | Structure | Code architecture reviews |
| 2 | Orchestrator | Dependencies | Dependency analysis |
| 3 | Sentry | Security | SAST/DAST tools |
| 4 | Money Mike | Efficiency | Performance profiling |
| 5 | Deebo | Compliance | Regulatory checks |
| 6 | Chaos Monkey | Resilience | Chaos engineering |
| 7 | Linus | Deployment | Final GO/NO-GO |

---

## Prompting Best Practices

### Effective Prompts

```
Good: "Create a function that validates email addresses using regex. 
       Return true if valid, false otherwise. Include JSDoc comments."

Bad: "Write email validation code."
```

### Techniques

1. **Be Specific** — Exact requirements, formats, constraints
2. **Provide Examples** — Show expected input/output
3. **Use Structure** — XML tags, numbered lists
4. **Reference Files** — Point to specific files/functions
5. **State Assumptions** — Make constraints explicit

### XML Tags (Claude Preference)

```xml
<context>
  Project uses TypeScript, Next.js 15, Firebase.
</context>

<task>
  Create a server action to fetch user profile.
</task>

<requirements>
  - Use Firestore
  - Include error handling
  - Return typed response
</requirements>
```

---

## Testing Standards

### Test-Driven Agentic Development

1. **Write test first** — Define expected behavior
2. **Generate implementation** — AI writes code to pass test
3. **Run tests** — Verify correctness
4. **Iterate** — Fix failures, add edge cases

### Test Coverage Requirements

| Type | Target |
|------|--------|
| Unit Tests | 80%+ coverage |
| Integration Tests | Critical paths |
| E2E Tests | User flows |

---

## Security Guidelines

### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation on all user input
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Proper error handling (no stack traces to users)
- [ ] Authentication/authorization checks

### Tools

- ESLint security plugins
- npm audit / yarn audit
- Snyk / Dependabot

---

## Related Files
- `CLAUDE.md` — Project context file
- `.agent/refs/testing.md` — Testing patterns
- `.agent/refs/tools.md` — Agent tools
- `src/server/agents/linus.ts` — Evaluation agent
