import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { TaskletChat } from './tasklet-chat';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { SuperAdminRightSidebar } from './super-admin-right-sidebar';

export default function SuperAdminAgentChat() {
    // Global Store State
    const { activeSessionId, createSession } = useAgentChatStore();

    // Local state for UI only
    const [chatKey, setChatKey] = useState(0);

    // Reset chat key when session changes to force re-render if needed
    // or just let TaskletChat handle it via props
    useEffect(() => {
        setChatKey(prev => prev + 1);
    }, [activeSessionId]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* CENTER - TaskletChat (Expanded) */}
            <div className="lg:col-span-5 h-[600px]">
                <TaskletChat
                    key={chatKey}
                    initialTitle={activeSessionId ? "Chat Session" : "New Chat"}
                    onBack={() => createSession()}
                />
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="lg:col-span-1">
                <SuperAdminRightSidebar />
            </div>
        </div>
    );
}


