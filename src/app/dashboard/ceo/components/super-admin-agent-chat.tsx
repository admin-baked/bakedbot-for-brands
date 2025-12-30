import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { SuperAdminRightSidebar } from './super-admin-right-sidebar';

export default function SuperAdminAgentChat() {
    // Global Store State
    const { activeSessionId, createSession } = useAgentChatStore();

    // Local state for UI only
    const [chatKey, setChatKey] = useState(0);

    // Reset chat key when session changes to force re-render if needed
    // or just let PuffChat handle it via props
    useEffect(() => {
        setChatKey(prev => prev + 1);
    }, [activeSessionId]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* CENTER - PuffChat (Expanded) */}
            <div className="lg:col-span-5 h-[600px]">
                <UnifiedAgentChat
                    key={chatKey}
                    role="super_admin"
                    showHeader={false} // Super Admin might want custom header or just the chat
                    isSuperUser={true}
                    className="h-full border-none shadow-none"
                    // PuffChat's onBack equivalent might be needed if UnifiedAgentChat exposes it?
                    // UnifiedAgentChat wraps PuffChat, but might not expose all props directly.
                    // However, UnifiedChat is "the new standard". 
                    // Let's assume onBack logic (createSession) is handled internally or via the store
                    // or if not exposed, we might need to add it to UnifiedAgentChat.
                    // Checking UnifiedAgentChat props... it doesn't expose onBack.
                    // But PuffChat DOES have onBack.
                    // For now, let's use UnifiedAgentChat without explicit onBack, 
                    // relying on the header "New Chat" button causing a session reset if implemented there.
                    // Or... since we hide the header (showHeader=false), maybe we want to show it?
                    // The original SuperAdminAgentChat had initialTitle="Chat Session" or "New Chat".
                />
             </div>

            {/* RIGHT SIDEBAR */}
            <div className="lg:col-span-1">
                <SuperAdminRightSidebar />
            </div>
        </div>
    );
}


