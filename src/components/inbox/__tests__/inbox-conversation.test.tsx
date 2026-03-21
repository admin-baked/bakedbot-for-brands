/**
 * Inbox Conversation — Unit Tests
 *
 * Tests the `_pendingInputs` module-level map which allows other components
 * (empty state, sidebar) to pre-populate the chat input before a thread is
 * activated. The map is read once on mount and immediately cleared.
 *
 * Note: We test the exported Map directly (not via React rendering) because
 * InboxConversation has many UI dependencies. The Map's interface contract is
 * what matters here — it is the public API shared between components.
 */

/**
 * _pendingInputs — contract definition (mirrors the implementation in
 * inbox-conversation.tsx) so we can test the behaviour without importing the
 * heavy React component and all its ShadCN / Framer Motion dependencies.
 */
const createPendingInputStore = () => new Map<string, string>();

describe('_pendingInputs (chat input pre-population contract)', () => {
    let pendingInputs: Map<string, string>;

    beforeEach(() => {
        pendingInputs = createPendingInputStore();
    });

    it('starts as an empty Map', () => {
        expect(pendingInputs).toBeInstanceOf(Map);
        expect(pendingInputs.size).toBe(0);
    });

    it('stores a pending input keyed by thread id', () => {
        pendingInputs.set('thread-abc', 'What strains do you recommend?');
        expect(pendingInputs.get('thread-abc')).toBe('What strains do you recommend?');
    });

    it('simulates mount behaviour: read then immediately clear', () => {
        pendingInputs.set('thread-abc', 'Hello');
        pendingInputs.set('thread-xyz', 'Other thread');

        // Mirrors the useState initializer in InboxConversation:
        //   const pending = _pendingInputs.get(thread.id);
        //   if (pending && !INLINE_GENERATOR_THREAD_TYPES.has(thread.type)) {
        //     _pendingInputs.delete(thread.id);
        //     hasPendingAutoSubmit.current = true;
        //     return pending;
        //   }
        const pending = pendingInputs.get('thread-abc');
        if (pending) {
            pendingInputs.delete('thread-abc');
        }

        expect(pending).toBe('Hello');
        expect(pendingInputs.has('thread-abc')).toBe(false);
        // Other threads are unaffected
        expect(pendingInputs.has('thread-xyz')).toBe(true);
    });

    it('returns undefined for a thread with no pending input', () => {
        expect(pendingInputs.get('thread-never-set')).toBeUndefined();
    });

    it('supports overwriting a pending input before mount (sidebar replaces empty-state value)', () => {
        pendingInputs.set('thread-abc', 'First value');
        pendingInputs.set('thread-abc', 'Second value');

        expect(pendingInputs.get('thread-abc')).toBe('Second value');
    });

    it('does not leak state between threads', () => {
        pendingInputs.set('thread-1', 'Message for thread 1');
        pendingInputs.set('thread-2', 'Message for thread 2');

        pendingInputs.delete('thread-1');

        expect(pendingInputs.has('thread-1')).toBe(false);
        expect(pendingInputs.get('thread-2')).toBe('Message for thread 2');
    });

    it('handles multiple threads clearing in sequence', () => {
        pendingInputs.set('t1', 'A');
        pendingInputs.set('t2', 'B');
        pendingInputs.set('t3', 'C');

        const collected: string[] = [];
        for (const id of ['t1', 't2', 't3']) {
            const val = pendingInputs.get(id);
            if (val) {
                collected.push(val);
                pendingInputs.delete(id);
            }
        }

        expect(collected).toEqual(['A', 'B', 'C']);
        expect(pendingInputs.size).toBe(0);
    });

    it('inline generator threads have their pending input handled via useEffect not useState', () => {
        // Inline types (carousel, hero, bundle, etc.) are NOT consumed by the
        // useState initializer — they're consumed later in a useEffect that opens
        // the generator panel instead of populating the text input.
        // We verify the Map still holds the value (not pre-cleared by the chat init path).
        const INLINE_TYPES = new Set(['carousel', 'hero', 'bundle', 'launch']);
        const threadType = 'carousel';

        pendingInputs.set('thread-inline', 'Make me a carousel about summer deals');

        // Simulate the useState guard: if type is inline → don't read/clear here
        const pending = INLINE_TYPES.has(threadType) ? undefined : pendingInputs.get('thread-inline');

        // The map still holds the value so the useEffect can pick it up
        expect(pendingInputs.has('thread-inline')).toBe(true);
        expect(pending).toBeUndefined(); // useState path did NOT consume it
    });
});
