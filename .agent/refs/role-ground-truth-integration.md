# Role Ground Truth Integration Guide

## Quick Reference: Integrating Role Ground Truth into Agents

This guide shows how to integrate role-based ground truth into agent initialization to provide role-specific context, QA pairs, and workflow guidance.

---

## Integration Pattern (Copy-Paste Template)

Add this code block to the **end** of any agent's `initialize()` method, just before `return agentMemory`:

```typescript
// === ROLE-BASED GROUND TRUTH (v2.0) ===
try {
    const { loadRoleGroundTruth, buildRoleSystemPrompt } = await import('@/server/grounding/role-loader');

    // Detect user role from context
    const userRole = (brandMemory as any).user_context?.role || 'brand';
    const tenantId = (brandMemory.brand_profile as any)?.id;

    // Map user role to RoleContextType
    let roleContext: 'brand' | 'dispensary' | 'super_user' | 'customer' = 'brand';
    if (userRole === 'dispensary' || userRole === 'budtender') {
        roleContext = 'dispensary';
    } else if (userRole === 'super_user' || userRole === 'super_admin' || userRole === 'owner') {
        roleContext = 'super_user';
    } else if (userRole === 'customer') {
        roleContext = 'customer';
    }

    // Load role-specific ground truth
    const roleGT = await loadRoleGroundTruth(roleContext, tenantId);

    if (roleGT) {
        // Build role-specific system prompt additions
        // Change 'craig' to your agent ID: 'smokey', 'leo', 'linus', etc.
        const rolePrompt = buildRoleSystemPrompt(roleGT, 'YOUR_AGENT_ID', 'full');

        // Append to system instructions
        agentMemory.system_instructions += `\n\n${rolePrompt}`;

        logger.info(`[YourAgent:GroundTruth] Loaded ${roleContext} ground truth`, {
            qaPairs: roleGT.metadata.total_qa_pairs,
            presetPrompts: roleGT.preset_prompts.length,
            workflows: roleGT.workflow_guides.length,
        });
    } else {
        logger.debug(`[YourAgent:GroundTruth] No ground truth found for role: ${roleContext}`);
    }
} catch (e) {
    logger.warn(`[YourAgent:GroundTruth] Failed to load role ground truth: ${e}`);
}
```

---

## Agents to Update

Apply the pattern to these agent files:

### Customer-Facing Agents
- ✅ **Craig** ([craig.ts](../../src/server/agents/craig.ts)) - Already integrated
- [ ] **Smokey** ([smokey.ts](../../src/server/agents/smokey.ts)) - Change agent ID to `'smokey'`
- [ ] **Mrs. Parker** ([mrs-parker.ts](../../src/server/agents/mrs-parker.ts)) - Change agent ID to `'mrs_parker'`

### Executive Agents (Super User Only)
- [ ] **Leo** ([leo.ts](../../src/server/agents/leo.ts)) - Change agent ID to `'leo'`
- [ ] **Linus** ([linus.ts](../../src/server/agents/linus.ts)) - Change agent ID to `'linus'`
- [ ] **Jack** ([jack.ts](../../src/server/agents/jack.ts)) - Change agent ID to `'jack'`
- [ ] **Glenda** ([glenda.ts](../../src/server/agents/glenda.ts)) - Change agent ID to `'glenda'`

### Operational Agents
- [ ] **Pops** ([pops.ts](../../src/server/agents/pops.ts)) - Change agent ID to `'pops'`
- [ ] **Ezal** ([ezal.ts](../../src/server/agents/ezal.ts)) - Change agent ID to `'ezal'`
- [ ] **Deebo** ([deebo.ts](../../src/server/agents/deebo.ts)) - Change agent ID to `'deebo'`
- [ ] **Day Day** ([day-day.ts](../../src/server/agents/day-day.ts)) - Change agent ID to `'day_day'`
- [ ] **Felisha** ([felisha.ts](../../src/server/agents/felisha.ts)) - Change agent ID to `'felisha'`

---

## Grounding Modes

The `buildRoleSystemPrompt()` function accepts a mode parameter:

```typescript
buildRoleSystemPrompt(roleGT, agentId, mode)
```

### Available Modes:

| Mode | QA Pairs Included | Workflows Included | Use Case |
|------|-------------------|-------------------|----------|
| `'full'` | All QA pairs | Yes | Default mode, complete context |
| `'condensed'` | Critical + High priority only | Yes | Reduce context length |
| `'critical_only'` | Critical compliance only | No | Minimal context for tight token budgets |

**Recommendation**: Start with `'full'` mode. If you hit context length limits, switch to `'condensed'`.

---

## What Gets Added to System Prompt

When role ground truth is loaded, the agent's system prompt is extended with:

### 1. Agent Persona Customizations (if configured)
```
=== ROLE-SPECIFIC GUIDANCE ===

{role-specific instructions for this agent}

DO:
- {role-specific best practices}

DON'T:
- {role-specific prohibitions}

EXAMPLE RESPONSES:
1. {example good response}
```

### 2. QA Knowledge Base
```
=== ROLE-SPECIFIC KNOWLEDGE BASE ===

You have been provided with X verified question-answer pairs for this role.
When users ask questions covered by this knowledge base, use these ideal answers.

### Marketing
1. Q: How do I create a product launch campaign?
   A: {ideal answer}
   Context: {additional context}
```

### 3. Workflow Guidance (full/condensed mode only)
```
=== AVAILABLE WORKFLOWS ===

The following workflows are available to guide users:

1. **Product Launch Campaign** (intermediate)
   Launch a new product with coordinated marketing across channels
   Steps: 5 | Est. Time: 2-3 hours
```

---

## Role Mapping Logic

The integration automatically maps user roles to ground truth contexts:

| User Role | Ground Truth Context | Access Level |
|-----------|---------------------|--------------|
| `brand`, `brand_admin`, `brand_member` | `brand` | Brand-specific guidance |
| `dispensary`, `dispensary_admin`, `budtender` | `dispensary` | Dispensary operations |
| `super_user`, `super_admin`, `owner` | `super_user` | Platform management |
| `customer` | `customer` | Customer assistance (Smokey) |

---

## Tenant Overrides

If a `tenantId` is provided, the loader automatically:
1. Loads global role ground truth
2. Loads tenant-specific overrides
3. Merges them (adds custom presets, removes disabled ones)

This happens transparently - no code changes needed.

---

## Performance Considerations

### In-Memory Caching
Role ground truth is cached for **5 minutes** to reduce Firestore reads:
- First request: Loads from Firestore
- Subsequent requests (within 5 min): Served from cache
- Cache is automatically invalidated after updates

### Cache Invalidation
When updating ground truth via server actions, the cache is automatically invalidated:
```typescript
import { invalidateRoleGroundTruthCache } from '@/server/grounding/role-loader';

// After updating ground truth
invalidateRoleGroundTruthCache('brand', tenantId);
```

---

## Example: Craig Agent Integration

See [craig.ts:104-135](../../src/server/agents/craig.ts#L104-L135) for the complete implementation.

**Key Points:**
- Added at the end of `initialize()` method
- Agent ID set to `'craig'`
- Uses `'full'` grounding mode
- Logs QA pairs, preset prompts, and workflow counts

---

## Testing

After integrating into an agent:

1. **Check Logs**: Look for `[AgentName:GroundTruth] Loaded {role} ground truth` in logs
2. **Verify Context**: Send a test message and check if role-specific knowledge appears in responses
3. **Test Workflows**: Ask about available workflows and verify they're listed
4. **Test Presets**: Check if preset prompts are available in inbox quick actions

---

## Troubleshooting

### No ground truth loaded
```
[Agent:GroundTruth] No ground truth found for role: brand
```
**Solution**: Create ground truth for that role in Firestore (`ground_truth_v2/brand`)

### Schema validation failed
```
[RoleGrounding] Schema validation failed
```
**Solution**: Check that the Firestore document matches the `RoleGroundTruthSchema`

### Firebase not available
```
[RoleGrounding] Firebase not available
```
**Solution**: Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is set in environment variables

---

## Next Steps

After integrating role ground truth into all agents:

1. **Create QA Pairs**: Add role-specific QA pairs via CEO dashboard
2. **Configure Presets**: Migrate existing quick actions to database
3. **Add Workflows**: Create step-by-step workflow guides
4. **Test with Users**: Verify accuracy with real user scenarios

---

*Last updated: 2026-01-29*
