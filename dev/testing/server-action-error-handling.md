# Server Action Error Handling - Testing Guide

## Overview

This document covers the error handling improvements made to server actions to prevent "Server Components render" failures (500 errors) on the CEO dashboard.

## Root Cause

Server actions that called `requireUser()` or `requireSuperUser()` outside of try-catch blocks would throw unhandled exceptions when:
- User session expired
- Firebase Auth token invalid
- Network issues during auth verification

These unhandled exceptions caused Next.js RSC (React Server Components) to return 500 errors with the generic message: "An error occurred in the Server Components render."

## Files Modified

### 1. Cloud Tasks Dispatch
- **File:** `src/server/jobs/dispatch.ts`
- **Fix:** Wrapped entire `dispatchAgentJob` function in try-catch
- **Returns:** `{ success: false, error: "Cloud Tasks dispatch failed: ..." }` on failure

### 2. Cloud Tasks Client
- **File:** `src/server/jobs/client.ts`
- **Fix:** Added try-catch to `getCloudTasksClient()`
- **Throws:** Descriptive error `Cloud Tasks client initialization failed: ...`

### 3. Projects Actions
- **File:** `src/server/actions/projects.ts`
- **Functions fixed:**
  - `getProjects()` - Returns `[]` on auth failure
  - `getProject()` - Returns `null` on failure
- **Pattern:** Auth failures return empty results instead of throwing

### 4. Chat Persistence
- **File:** `src/server/actions/chat-persistence.ts`
- **Fix:** Added `Array.isArray()` guards for `messages` and `artifacts`
- **Prevents:** `TypeError: w.map is not a function` when data is corrupted

### 5. CEO Dashboard Page
- **File:** `src/app/dashboard/ceo/page.tsx`
- **Fix:** Added array type guards in session hydration
- **Pattern:** `Array.isArray(result.sessions)` and `Array.isArray(s.messages)`

### 6. Browser Automation Actions
- **File:** `src/server/actions/browser-automation.ts`
- **Functions fixed (30+):**
  - `createBrowserSession`, `getBrowserSession`, `pauseBrowserSession`
  - `resumeBrowserSession`, `endBrowserSession`, `getBrowserSessionHistory`
  - `executeBrowserAction`, `getBrowserTabs`
  - `grantSitePermission`, `revokeSitePermission`, `blockSiteDomain`
  - `getSitePermission`, `getPendingConfirmation`
  - `confirmBrowserAction`, `denyBrowserAction`
  - `startWorkflowRecording`, `pauseWorkflowRecording`, `resumeWorkflowRecording`
  - `stopWorkflowRecording`, `cancelWorkflowRecording`
  - `saveWorkflow`, `updateWorkflow`, `deleteWorkflow`, `getWorkflow`, `runWorkflow`
  - `scheduleBrowserTask`, `updateBrowserTask`, `cancelBrowserTask`
  - `deleteBrowserTask`, `getBrowserTask`, `runBrowserTaskNow`
  - `enableBrowserTask`, `disableBrowserTask`
- **Pattern:** All `requireSuperUser()` calls wrapped in try-catch

### 7. Playbooks Actions
- **File:** `src/server/actions/playbooks.ts`
- **Functions fixed:**
  - `listBrandPlaybooks()` - Returns `[]` instead of throwing
  - `togglePlaybookStatus()` - Added try-catch wrapper
  - `runPlaybookTest()` - Added try-catch wrapper

## Testing Procedures

### Test 1: Unauthenticated Access
1. Open browser in incognito mode
2. Navigate directly to `/dashboard/ceo`
3. **Expected:** Redirect to login or empty dashboard (no 500 error)

### Test 2: Expired Session
1. Login to CEO dashboard
2. Wait for session to expire (or manually clear cookies)
3. Click on different tabs (Boardroom, Browser, Playbooks)
4. **Expected:** Graceful error handling, no console 500 errors

### Test 3: Projects Tab
1. Navigate to CEO dashboard
2. Open browser console
3. Check for "Failed to fetch projects" errors
4. **Expected:** Either projects load or empty state shown (no 500)

### Test 4: Playbooks Tab
1. Click on Playbooks tab
2. Monitor network tab for 500 errors
3. **Expected:** Playbooks load or empty state (no 500)

### Test 5: Browser Automation Tab
1. Click on Browser tab
2. Monitor console for errors
3. **Expected:** Tab loads without 500 errors

### Test 6: Chat Session Hydration
1. Load CEO dashboard
2. Check console for "Failed to hydrate sessions"
3. **Expected:** If logged in, sessions load; if not, graceful empty state

### Test 7: Agent Chat (Review Recent Signups)
1. Go to Boardroom tab
2. Click "Review Recent Signups" quick action
3. **Expected:** Chat starts or shows error message (no 500)

## Unit Tests

Located at: `tests/server/jobs/dispatch.test.ts`

```bash
npm test -- tests/server/jobs/dispatch.test.ts
```

### Test Cases:
1. `should return success when dispatch succeeds`
2. `should return error object instead of throwing when Cloud Tasks create fails`
3. `should return error object when auth client initialization fails`
4. `should include proper URL and headers in task request`
5. `should initialize with correct scopes`
6. `should throw with descriptive error when auth fails`
7. `should construct correct queue path`
8. `should use default queue name when not specified`

## Error Response Patterns

### Pattern 1: Return Empty Collection
```typescript
export async function listItems(): Promise<Item[]> {
    try {
        const user = await requireUser();
        // ... fetch logic
        return items;
    } catch (error) {
        console.error('[Module] listItems failed:', error);
        return []; // Graceful empty state
    }
}
```

### Pattern 2: Return Null for Single Item
```typescript
export async function getItem(id: string): Promise<Item | null> {
    try {
        await requireUser();
        // ... fetch logic
        return item;
    } catch (error) {
        console.error('[Module] getItem failed:', error);
        return null; // Graceful null response
    }
}
```

### Pattern 3: Return ActionResult Object
```typescript
export async function performAction(): Promise<ActionResult> {
    try {
        await requireUser();
        // ... action logic
        return { success: true };
    } catch (error) {
        console.error('[Module] performAction failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to perform action'
        };
    }
}
```

## Monitoring

After deployment, monitor for:
1. Reduction in 500 errors on `/dashboard/ceo` endpoint
2. Proper error messages in browser console instead of generic RSC errors
3. Dashboard functionality with expired/invalid sessions

## Related Commits

1. `fix(server): Add error handling to prevent Server Component render failures`
2. `fix(server): Add error handling to browser-automation server actions`
3. `fix(server): Add error handling to playbooks server actions`
