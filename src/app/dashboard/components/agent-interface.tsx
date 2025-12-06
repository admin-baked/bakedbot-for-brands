'use client';

import Chatbot from '@/components/chatbot';

export default function AgentInterface() {
    return (
        <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto w-full p-4 space-y-6">
            <div className="relative w-full h-full min-h-[600px] border rounded-xl overflow-hidden shadow-sm bg-background">
                <Chatbot
                    isSuperAdmin={true}
                    initialOpen={true}
                    positionStrategy="relative"
                    className="hidden" // Hide the trigger button
                    windowClassName="w-full h-full shadow-none border-0"
                />
            </div>
        </div>
    );
}
