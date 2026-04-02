---
date: 2026-04-02
time: 09:12
slug: inbox-seeded-prompt-recovery
commits: [d168d3d68]
features: [Inbox seeded-prompt recovery, animated workspace briefing fade, simplify cleanup]
---

## Session 2026-04-02 - Inbox seeded prompt recovery

- Fixed the inbox regression where seeded prompts could open a new thread with the prompt in the title but no visible message. Auto-submit now waits until the pending thread finishes persistence before sending the first message.
- Kept the workspace briefing visible until a conversation actually starts, then animated it out with a slower blur/height fade so the transition feels intentional instead of snapping away on thread open.
- Ran `/simplify` before push and tightened the implementation by removing the extra page-shell thread subscription, avoiding a second message source inside `InboxConversation`, and cleaning up the focused test files.

### Verification

- `.\scripts\npm-safe.cmd test -- tests/components/inbox/inbox-conversation.test.tsx tests/app/dashboard/inbox-page.test.tsx src/lib/store/__tests__/inbox-store.test.ts src/components/inbox/__tests__/inbox-conversation-thinking.test.tsx --runInBand` passed.
- `.\scripts\npm-safe.cmd run check:types` passed.

### Gotchas

- The seeded new-thread flow relies on `_pendingInputs` plus a pending-thread persistence flag. If auto-submit fires before `markThreadPersisted`, `handleSubmit` returns early and the thread looks empty even though the prompt text exists.
- The page shell only needs a boolean for whether the active thread has started, not the full active-thread object. Keeping that selector narrow avoids rerendering the entire inbox header on every streamed message.
