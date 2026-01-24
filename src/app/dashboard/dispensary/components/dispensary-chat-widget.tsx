'use client';

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function DispensaryChatWidget() {
    const DISPENSARY_PROMPTS = [
        "Spy on competitor pricing near me",
        "Scan my site for compliance risks",
        "Draft a campaign in 30 seconds",
        "Find slow movers I can bundle",
        "Show me today's opportunities"
    ];

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-muted/30 p-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Ask Smokey (Dispensary)
                </h3>
            </div>
            <div className="flex-1 overflow-hidden">
                <PuffChat
                    initialTitle="Ops Assistant"
                    promptSuggestions={DISPENSARY_PROMPTS}
                    className="h-full border-none shadow-none rounded-none"
                />
            </div>
        </div>
    );
}
