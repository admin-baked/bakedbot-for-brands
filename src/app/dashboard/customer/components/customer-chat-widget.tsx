'use client';

/**
 * Enhanced Customer Chat Widget
 * 
 * AI-powered cannabis concierge with tailored prompts and styling for customers.
 */

import { useState } from 'react';
import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { CUSTOMER_CHAT_CONFIG } from '@/lib/chat/role-chat-config';
import { Sparkles, ShoppingCart, Leaf, Heart, Zap, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Quick intent buttons for faster interactions
const QUICK_INTENTS = [
    { label: 'Sleep', icon: Coffee, emoji: '😴' },
    { label: 'Energy', icon: Zap, emoji: '⚡' },
    { label: 'Relax', icon: Heart, emoji: '🧘' },
    { label: 'Pain', icon: Leaf, emoji: '💆' },
];

export function CustomerChatWidget() {
    const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
    const config = CUSTOMER_CHAT_CONFIG;

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
            {/* Header with emerald theme */}
            <div className="bg-gradient-to-r from-emerald-50 to-background p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-emerald-800">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        {config.title}
                    </h3>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Personal Budtender
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>

            {/* Quick Intent Buttons */}
            <div className="px-4 py-3 border-b flex items-center gap-2 overflow-x-auto bg-muted/30">
                <span className="text-xs text-muted-foreground whitespace-nowrap">I want:</span>
                {QUICK_INTENTS.map((intent) => (
                    <Button
                        key={intent.label}
                        size="sm"
                        variant={selectedIntent === intent.label ? "default" : "outline"}
                        className={cn(
                            "text-xs h-7 gap-1 whitespace-nowrap",
                            selectedIntent === intent.label && "bg-emerald-600 hover:bg-emerald-700"
                        )}
                        onClick={() => setSelectedIntent(intent.label)}
                    >
                        <span>{intent.emoji}</span>
                        {intent.label}
                    </Button>
                ))}
            </div>

            {/* Chat Interface */}
            <div className="flex-1 overflow-hidden">
                <PuffChat
                    initialTitle={config.title}
                    promptSuggestions={config.promptSuggestions}
                />
            </div>
        </div>
    );
}
