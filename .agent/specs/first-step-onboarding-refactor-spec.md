# Spec: First Step Onboarding Refactor

**Date:** 2026-03-06
**Requested by:** Self-initiated
**Spec status:** 🟡 Draft

---

### 1. Intent (Why)

Increase new user activation rate by 30% through a clear, role-guided first step that reduces time-to-first-value from signup to productive use.

### 2. Scope (What)

**Files affected:**
- `src/app/dashboard/page.tsx` - Modify to redirect new users to role-specific first steps
- `src/app/dashboard/components/onboarding-welcome.tsx` - New component for guided first step
- `src/app/dashboard/components/role-selector.tsx` - New component for initial role clarification
- `src/app/dashboard/onboarding/[step]/page.tsx` - New progressive onboarding flow structure
- `src/app/dashboard/onboarding/checklist/page.tsx` - New interactive checklist
- `src/app/dashboard/onboarding/brand-setup/page.tsx` - Brand-specific first step
- `src/app/dashboard/onboarding/dispensary-setup/page.tsx` - Dispensary-specific first step
- `src/components/ui/onboarding-card.tsx` - New reusable onboarding card component
- `src/hooks/use-onboarding-progress.ts` - New hook to track onboarding state
- `src/server/actions/get-onboarding-status.ts` - New server action for progress tracking

**Files explicitly NOT touched:**
- `src/server/auth/` - Authentication flows remain unchanged
- `src/app/settings/` - Settings pages remain separate from onboarding
- `src/app/claim/` - Claim flow is a separate user journey
- Backend data synchronization logic

**Estimated diff size:** 450 lines (target < 400 per Constitution §II)

### 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | No | Uses existing auth hooks |
| Touches payment or billing? | No | Setup is free/initial configuration |
| Modifies database schema? | No | Uses existing users/orgs collections |
| Changes infra cost profile | No | No additional services required |
| Modifies LLM prompts or agent behavior? | No | No prompt changes in this spec |
| Touches compliance logic | No | Setup is informational only |
| Adds new external dependency? | No | Using existing UI components |

**Escalation needed?** No

### 4. Implementation Plan

1. **Create onboarding progress tracking**
   - Implement `use-onboarding-progress.ts` hook to track new user state
   - Create `get-onboarding-status.ts` server action
   - Define onboarding milestones and completion criteria

2. **Create reusable onboarding UI components**
   - Build `onboarding-card.tsx` with consistent styling and progress indicators
   - Create `role-selector.tsx` for initial role clarification
   - Build `onboarding-welcome.tsx` with role-specific messaging

3. **Implement role-based first step redirection**
   - Modify `dashboard/page.tsx` to detect new users and redirect
   - Add logic to determine "first-time" vs "returning" user
   - Create different entry points for brand vs dispensary users

4. **Build progressive onboarding flow**
   - Create `/dashboard/onboarding/` directory structure
   - Build step 1: Role selection and clarification
   - Build step 2: Business information collection
   - Build step 3: Data source connection
   - Build interactive checklist with progress tracking

5. **Implement role-specific setup experiences**
   - Brand setup: Focus on brand story, visual identity, and market position
   - Dispensary setup: Focus on menu integration, service details, and location data

6. **Add preview integration**
   - Real-time preview of brand/shop page during setup
   - Progress indicators showing what's being built

### 5. Test Plan

**Unit tests:**
- [ ] `use-onboarding-progress.test.ts` - validates progress tracking state
- [ ] `role-selector.test.ts` - validates role selection UI
- [ ] `get-onboarding-status.test.ts` - validates server action logic

**Integration tests:**
- [ ] `onboarding-flow-integration.test.ts` - validates complete user journey
- [ ] `role-based-redirection.test.ts` - validates proper routing for different roles

**Manual smoke test:**
- [ ] Create new test account and verify onboarding flow
- [ ] Test role selection and route to correct setup flow
- [ ] Verify progress tracking works correctly
- [ ] Test preview functionality during setup

### 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes |
| Feature flag? | Flag name: `NEW_ONBOARDING_FLOW` |
| Data migration rollback needed? | No - no database changes |
| Downstream services affected? | None - pure UI/frontend changes |

### 7. Success Criteria

- [ ] All tests pass (zero regressions)
- [ ] Onboarding completion rate increases to >80% within 2 weeks
- [ ] Support tickets for "what do I do first?" reduced by 70%
- [ ] No increase in bounce rate from dashboard page
- [ ] Users successfully reach first-value step in <5 minutes

---

### Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]

---

_After approval, proceed to implementation per `.agent/prime.md` Workflow Protocol._