'use client';

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
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
        <PuffChat
            initialTitle="Revenue Ops Assistant"
            promptSuggestions={BRAND_PROMPTS}
            hideHeader={true}
            className="h-full border-0 shadow-none rounded-none"
        />
    );
}
