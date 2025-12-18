'use client';

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { Sparkles } from 'lucide-react';

export function CustomerChatWidget() {
    const CUSTOMER_INTENTS = [
        "I want: Sleep / Chill",
        "Cheapest options near me",
        "Something like my favorite",
        "Build a cart under $50",
        "Show top deals today"
    ];

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-gradient-to-r from-emerald-50 to-background p-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-800">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Ask Smokey (Your Personal Budtender)
                </h3>
            </div>
            <div className="flex-1 overflow-hidden">
                <PuffChat
                    initialTitle="Cannabis Concierge"
                    promptSuggestions={CUSTOMER_INTENTS}
                />
            </div>
        </div>
    );
}
