
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agent Chat | BakedBot AI',
    description: 'Unified interface for all AI agents.',
};

export default async function ChatPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; role?: string }>;
}) {
    // If a query is provided via URL (from Homepage/Tasks), we can pass it down.
    // UnifiedAgentChat handles its own state, but we might want to pre-seed the prompt?
    // Current UnifiedAgentChat implementation doesn't seem to take an 'initialQuery' prop directly,
    // but relies on its internal logic or the URL if wired up.
    // For now, we render the component. Future improvement: Pass searchParams.q to PuffChat via UnifiedAgentChat.

    const { role } = await searchParams;

    return (
        <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
            <h1 className="text-2xl font-bold mb-4">Agent Workspace</h1>
            <UnifiedAgentChat
                role={role as any || 'public'} 
                showHeader={true}
                className="h-[600px] shadow-md border"
            />
        </div>
    );
}
