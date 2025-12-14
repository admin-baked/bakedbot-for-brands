'use client';

import { TaskletChat } from '@/app/dashboard/ceo/components/tasklet-chat';
import { Sparkles } from 'lucide-react';

export function BrandChatWidget() {
    const BRAND_PROMPTS = [
        "Where are we losing velocity and why?",
        "Which retailers are underpricing us?",
        "Draft a compliant launch campaign for Gummies",
        "Find 20 new dispensaries that match our buyers",
        "Summarize this week: wins, risks, next actions"
    ];

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-muted/30 p-4 border-b">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Ask Baked HQ (Brand)
                </h3>
            </div>
            <div className="flex-1 overflow-hidden">
                <TaskletChat
                    initialTitle="Revenue Ops Assistant"
                    promptSuggestions={BRAND_PROMPTS}
                />
            </div>
        </div>
    );
}
