'use client';

/**
 * Super User Agent Chat
 *
 * Internal command interface for Super Users. This is a thin wrapper around
 * the shared AgentChat component that supports:
 * - Quick action injection via window "agent-command" events
 * - Role-appropriate placeholder + thinking defaults
 */

import { useEffect, useState } from 'react';
import { AgentChat } from '@/app/dashboard/playbooks/components/agent-chat';

export function SuperUserAgentChat() {
    const [externalInput, setExternalInput] = useState<string | undefined>();

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ command?: string }>).detail;
            const command = (detail?.command || '').trim();
            if (!command) return;

            setExternalInput(command);

            // Clear immediately so the same command can be triggered again.
            setTimeout(() => setExternalInput(undefined), 0);
        };

        window.addEventListener('agent-command', handler as EventListener);
        return () => window.removeEventListener('agent-command', handler as EventListener);
    }, []);

    return (
        <AgentChat
            mode="superuser"
            initialTitle="Operations Command"
            placeholder="Try: 'Generate weekly platform report' or 'Create a welcome email playbook for new signups'"
            defaultThinkingLevel="advanced"
            externalInput={externalInput}
        />
    );
}

