# Session Handoff Reference

## Overview
When an agent completes significant work or a session ends mid-task, create a **session handoff** document so future agents can seamlessly continue the work.

---

## When to Create a Handoff

Create a session handoff when:
1. **Session ending mid-feature** - Work in progress that needs continuation
2. **Major feature complete** - Comprehensive state for maintenance
3. **Complex debugging** - Capture investigation context
4. **Pilot/customer setup** - Document configuration state

---

## Handoff Document Structure

```markdown
# [Feature/Project Name] - Session Handoff

**Date**: YYYY-MM-DD
**Agent**: [Agent name]
**Status**: [In Progress | Complete | Blocked]

---

## Summary
[1-2 sentence description of what this work accomplishes]

---

## Primary Request & Intent
[Bullet points of what the user asked for and the interpreted goals]

---

## Technical Context
[Key technical concepts, patterns, or approaches used]

---

## Files Changed

| File | Changes |
|------|---------|
| `path/to/file.ts` | [Brief description] |

### Key Code Snippets
[Include critical code blocks that future agents need to understand]

---

## Errors & Fixes
| Error | Root Cause | Fix |
|-------|------------|-----|
| [Error description] | [Why it happened] | [How it was fixed] |

---

## Decisions Made
1. [Decision and reasoning]
2. [Decision and reasoning]

---

## Current State
[What is working, what is not, what needs attention]

---

## Pending Tasks
- [ ] Task 1
- [ ] Task 2

---

## Next Steps
[Recommended immediate actions for the continuing agent]

---

## Related Files
- `refs/relevant-ref.md`
- `dev/testing/relevant-test.md`
```

---

## Storage Location

| Type | Location | Example |
|------|----------|---------|
| **Feature Handoffs** | `dev/handoffs/` | `dev/handoffs/ecstatic-edibles-pilot.md` |
| **Quick Context** | `dev/work_archive/` | JSON artifacts for tooling |
| **Testing Guides** | `dev/testing/` | `dev/testing/feature-test.md` |

---

## Example: Pilot Customer Handoff

```markdown
# Ecstatic Edibles Pilot - Session Handoff

**Date**: 2026-01-21
**Agent**: Claude Opus
**Status**: In Progress

---

## Summary
Setting up Ecstatic Edibles as the first hemp e-commerce pilot with shipping checkout and Authorize.net integration.

---

## Primary Request & Intent
- Create pilot customer account for hemp brand
- Implement shipping checkout (vs local pickup)
- Configure Authorize.net payment processing
- Enable state restriction validation for shipping

---

## Technical Context
- Firebase Auth with custom claims (role, brandId, orgId, approvalStatus)
- `purchaseMode` state in Zustand cart store
- Authorize.net ARB for subscriptions, direct auth for orders
- Hemp products have: weight, servings, mgPerServing, shippable fields
- Blocked states: ID, MS, SD, NE, KS

---

## Files Changed

| File | Changes |
|------|---------|
| `src/app/dashboard/layout.tsx` | Added ErrorBoundary wrapper |
| `src/app/checkout/page.tsx` | Shipping checkout flow |
| `dev/configure-ecstatic-edibles.ts` | Setup script |

### Key Code Snippet: State Validation
```typescript
const BLOCKED_STATES = ['ID', 'MS', 'SD', 'NE', 'KS'];
if (BLOCKED_STATES.includes(state)) {
  throw new Error(`Cannot ship to ${state} due to regulations`);
}
```

---

## Errors & Fixes
| Error | Root Cause | Fix |
|-------|------------|-----|
| White screen on login | Server component error not caught | Added ErrorBoundary |
| 400 token refresh | setCustomUserClaims invalidated tokens | User needs fresh login |

---

## Decisions Made
1. **Free shipping for pilot** - No shipping calculation, flat free
2. **State blocks at checkout** - Fail early with clear message
3. **ErrorBoundary at layout level** - Catch all dashboard errors

---

## Current State
- Configuration script runs successfully
- Dashboard loads with ErrorBoundary protection
- Token refresh issue requires user to clear cookies

---

## Pending Tasks
- [ ] Fix token invalidation after setCustomUserClaims
- [ ] Complete TC-001 through TC-010 testing
- [ ] Verify Authorize.net sandbox payments

---

## Next Steps
1. User needs to fully clear browser data and re-login
2. Run through test cases in `dev/testing/ecstatic-edibles-pilot-test.md`
3. Verify payment flow in sandbox mode

---

## Related Files
- `refs/pilot-setup.md` - Pilot system documentation
- `dev/testing/ecstatic-edibles-pilot-test.md` - Test cases
```

---

## Workflow Integration

### At Session End
1. If work is incomplete, create handoff in `dev/handoffs/`
2. Reference the handoff in `dev/progress_log.md`
3. Commit the handoff document

### At Session Start
1. Check `dev/handoffs/` for pending work
2. Read relevant handoff before continuing
3. Update handoff status as work progresses
4. Delete or archive handoff when complete

---

## Handoff vs Work Archive

| Aspect | Session Handoff | Work Archive |
|--------|-----------------|--------------|
| **Purpose** | Continue mid-task | Historical record |
| **Lifespan** | Temporary (until complete) | Permanent |
| **Format** | Markdown (human readable) | JSON (tool-friendly) |
| **Created** | Session end | Task completion |
| **Location** | `dev/handoffs/` | `dev/work_archive/` |

---

## Tool Integration

Linus can use these tools for handoffs:

```typescript
// Query existing handoffs
await query_work_history({ query: 'handoff', lookbackDays: 7 });

// Archive completed handoff to work archive
await archive_work({
  type: 'feature',
  summary: 'Completed Ecstatic Edibles pilot setup',
  filesChanged: [...],
  reasoning: 'First hemp e-commerce pilot customer',
  decisions: ['Free shipping', 'State validation at checkout']
});
```

---

## Related Documentation
- `refs/work-archive.md` - Permanent artifact storage
- `refs/agentic-coding.md` - Agent workflow best practices
- `refs/pilot-setup.md` - Pilot customer system
