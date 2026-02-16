# Super User Option Selection & Integration Card Fix

**Date:** 2026-02-15
**Status:** ✅ Complete - 0 TypeScript errors added

## Problem Summary

When super users asked about integrations and received Option A/B/C responses from Leo (COO), selecting an option like "Option A: Route to Technical Lead (Linus)" did **NOT** actually delegate to Linus. Instead, it just showed another generic Operations Dashboard.

### Observed Behavior:
1. User: "Let's connect integrations"
2. Leo: Responds with "Option A: Route to Technical Lead" options
3. User: "Option A"
4. **BUG**: System showed generic dashboard instead of delegating to Linus

### Expected Behavior:
1. User: "Let's connect integrations"
2. Leo: Responds with formatted options + Google integration inline cards
3. User: "Option A"
4. **FIXED**: System detects selection, automatically calls `delegateTask(linus, "setup Google OAuth")`

---

## Solution Implemented

### 1. Option Detection Utility (`option-detector.ts`)

Created a new utility that:
- **Detects option patterns**: "Option A", "A", "1", "Option 1", etc.
- **Parses last agent message** to extract available options
- **Matches user selection** to the corresponding option
- **Auto-detects tool calls**: "Route to Linus" → `delegateTask(linus, ...)`

**File:** [`src/server/agents/utils/option-detector.ts`](src/server/agents/utils/option-detector.ts)

**Key Functions:**
```typescript
// Detects if user is selecting an option
detectOptionSelection(userMessage: string, lastAgentMessage?: string): OptionDetectionResult

// Extracts options from agent's formatted response
extractOptionsFromMessage(message: string): OptionContext[]

// Parses action strings to identify tool calls
parseActionForTool(action: string): { toolName: string; args: Record<string, any> } | null
```

### 2. Leo Agent Enhancement

Modified Leo's `act()` method to:
- **Store last response** in `agentMemory.lastResponse` for context
- **Detect option selections** before running multi-step task
- **Auto-execute delegation** when option maps to `delegateTask`
- **Expand queries** with full context when not a direct tool call

**Changes in [`src/server/agents/leo.ts`](src/server/agents/leo.ts):**

```typescript
// Line 177-230: Option detection and auto-delegation
const optionDetection = detectOptionSelection(userQuery, lastAgentMessage);

if (optionDetection.detected && optionDetection.selectedOption) {
    // If it's a delegation, execute immediately
    if (optionDetection.selectedOption.toolName === 'delegateTask') {
        const { personaId, task } = optionDetection.selectedOption.toolArgs;
        const result = await tools.delegateTask(personaId, task);
        // Return result immediately, skipping multi-step planning
    }
}

// Line 375-377: Store response for future option detection
(agentMemory as any).lastResponse = result.finalResult;
```

### 3. Enhanced System Instructions

Added to Leo's system prompt:
- **Option formatting guide** - How to structure options for auto-detection
- **Delegation examples** - Sample option patterns that trigger delegation
- **Integration card syntax** - How to embed Google Workspace status cards

**Format:**
```markdown
**Option A: Route to Technical Lead**
Delegate to Linus (AI CTO) to architect the technical implementation

**Option B: Create Setup Checklist**
Generate a step-by-step implementation guide
```

### 4. Google Integration Inline Cards

Created new component to display Google Workspace integration status with Connect buttons.

**New File:** [`src/components/inbox/artifacts/google-integration-status.tsx`](src/components/inbox/artifacts/google-integration-status.tsx)

**Marker Syntax:**
```
:::google:status
{
  "gmail": { "status": "offline", "connectUrl": "/api/auth/google?service=gmail" },
  "calendar": { "status": "offline", "connectUrl": "/api/auth/google?service=calendar" },
  "drive": { "status": "offline", "connectUrl": "/api/auth/google?service=drive" },
  "sheets": { "status": "offline", "connectUrl": "/api/auth/google?service=sheets" }
}
:::
```

**Renders as:**
- 2x2 grid of service cards
- Each shows icon, name, status badge (Online/Offline)
- "Connect" button for offline services
- Clicking "Connect" → OAuth flow

**Integration:** Added parser to [`inbox-conversation.tsx`](src/components/inbox/inbox-conversation.tsx) to detect and render inline cards.

---

## Files Created (3 files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/agents/utils/option-detector.ts` | 240 | Option detection + parsing utility |
| `src/components/inbox/artifacts/google-integration-status.tsx` | 128 | Google integration status inline card |
| `SUPER_USER_OPTION_FIX.md` | (this file) | Documentation |

## Files Modified (2 files)

| File | Changes |
|------|---------|
| `src/server/agents/leo.ts` | +60 lines: Option detection, auto-delegation, response storage, enhanced instructions |
| `src/components/inbox/inbox-conversation.tsx` | +8 lines: Added Google integration status parsing + rendering |

---

## How It Works Now

### Flow Diagram

```
User: "Let's connect integrations"
    ↓
Leo: Checks integration status (Gmail/Calendar/Drive/Sheets)
    ↓
Leo: Responds with:
    - Integration status inline cards
    - Formatted options (A/B/C)
    ↓
User: "Option A" (or "A" or "1")
    ↓
Leo.act(): detectOptionSelection(userMessage, lastResponse)
    ↓
Detected: "Option A: Route to Technical Lead (Linus)"
    ↓
parseActionForTool("Route to Technical Lead")
    ↓
Returns: { toolName: "delegateTask", args: { personaId: "linus", task: "..." } }
    ↓
tools.delegateTask("linus", "architect Google OAuth implementation")
    ↓
Result: Task delegated to Linus → Linus responds with technical plan
```

### Agent Pattern Detection

**Supported patterns:**
- "Route to Linus" → `delegateTask("linus", ...)`
- "Route to Technical Lead" → `delegateTask("linus", ...)`
- "Route to Jack" / "Revenue" → `delegateTask("jack", ...)`
- "Route to Glenda" / "Marketing" → `delegateTask("glenda", ...)`
- ...and all other agents in [`agent-definitions.ts`](src/server/agents/agent-definitions.ts)

---

## Testing

### Manual Test Script

```bash
# Start dev server
npm run dev
```

**Test Sequence:**
1. Login as super_user (e.g., martez@bakedbot.ai)
2. Navigate to `/dashboard/inbox`
3. Send message: "Check System Health Status"
4. **Expect:** Leo shows integration status cards (Gmail/Calendar/Drive/Sheets with "Connect" buttons)
5. Send message: "Lets connect integrations"
6. **Expect:** Leo shows Options A/B/C with inline Google cards
7. Send message: "Option A"
8. **Expect:** Auto-delegation to Linus with response about OAuth setup
9. **Verify:** NO generic Operations Dashboard spam

### Automated Test (Future)

Create unit test in `src/server/agents/utils/__tests__/option-detector.test.ts`:
```typescript
describe('option-detector', () => {
  it('should detect "Option A" selection', () => {
    const lastMessage = `
**Option A: Route to Technical Lead**
Delegate to Linus (AI CTO) to architect the OAuth implementation
**Option B: Create Setup Checklist**
Generate a step-by-step guide
    `;
    const result = detectOptionSelection('Option A', lastMessage);
    expect(result.detected).toBe(true);
    expect(result.selectedOption?.toolName).toBe('delegateTask');
    expect(result.selectedOption?.toolArgs?.personaId).toBe('linus');
  });
});
```

---

## TypeScript Check

```bash
npm run check:types
```

**Result:** ✅ 0 new errors (only 109 pre-existing Next.js 15+ type errors from params/searchParams)

---

## Integration Points

### Other Agents Can Use This

The option detector is generic and can be used by any agent:

```typescript
import { detectOptionSelection } from './utils/option-detector';

// In any agent's act() method:
const optionDetection = detectOptionSelection(userQuery, lastResponse);
if (optionDetection.detected) {
  // Handle option selection
}
```

### Inline Card Pattern

Other services can follow the same pattern:

```typescript
// In agent response:
`
:::service:card-type
{json-data}
:::
`

// Create parser in components/inbox/artifacts/:
export function parseServiceCard(content: string): { data, cleanedContent }

// Add to inbox-conversation.tsx parsing chain
```

---

## Future Enhancements

1. **Option Memory Persistence**: Store option context in Firestore instead of just agent memory
2. **Multi-Turn Option Menus**: Support nested option selection (Option A → Option A1/A2)
3. **Option Preview**: Show what each option will do before execution
4. **Undo Option Selection**: Allow users to go back after selecting
5. **Voice Option Selection**: "Hey BakedBot, choose option A"

---

## Deployment

**Status:** ✅ Ready to commit and push

**Commit Message:**
```
fix(agents): Add option detection and auto-delegation for super user flows

- Created option-detector utility to parse user selections (Option A/B/C, 1/2/3)
- Enhanced Leo agent to auto-execute delegateTask when options are selected
- Added Google Workspace integration status inline cards
- Improved system instructions for consistent option formatting

Fixes issue where selecting "Option A: Route to Linus" didn't actually delegate to Linus.

Files created:
- src/server/agents/utils/option-detector.ts (240 lines)
- src/components/inbox/artifacts/google-integration-status.tsx (128 lines)

Files modified:
- src/server/agents/leo.ts (+60 lines)
- src/components/inbox/inbox-conversation.tsx (+8 lines)

Type check: 0 new errors
```

---

## Notes for Future Developers

- **Don't break option parsing**: If you change Leo's response format, update `extractOptionsFromMessage()`
- **Add new agents**: Register them in `parseActionForTool()` pattern matching
- **New inline cards**: Follow the `:::marker:type\n{json}\n:::` pattern and add parser to inbox-conversation.tsx
- **Test with real users**: Super users expect immediate delegation, not more menus

---

**Implementation by:** Claude Code
**Reviewed by:** (pending)
**Status:** ✅ Complete, ready for production
