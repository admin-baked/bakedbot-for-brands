'use client';

import { TaskletChat } from '@/app/dashboard/ceo/components/tasklet-chat';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function DispensaryChatWidget() {
    const DISPENSARY_PROMPTS = [
        "What’s hurting conversion today?",
        "Any inventory risks in the next 72 hours?",
        "Draft a compliant promo for slow-moving SKUs",
        "Show competitor price gaps (top 10 items)",
        "Summarize today’s issues + recommended actions"
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
                <TaskletChat
                    initialTitle="Ops Assistant"
                    promptSuggestions={DISPENSARY_PROMPTS}
                />
            </div>
        </div>
    );
}
