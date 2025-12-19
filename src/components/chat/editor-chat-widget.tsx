'use client';

/**
 * Editor Chat Widget
 * 
 * AI-powered content assistant for editors with SEO and writing tools.
 */

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { EDITOR_CHAT_CONFIG } from '@/lib/chat/role-chat-config';
import { Edit3, FileText, Search, Sparkles, Type, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Quick action tools for editors
const EDITOR_TOOLS = [
    { label: 'SEO Check', icon: Search },
    { label: 'Compliance', icon: CheckCircle },
    { label: 'Optimize', icon: Sparkles },
    { label: 'Grammar', icon: Type },
];

export function EditorChatWidget() {
    const config = EDITOR_CHAT_CONFIG;

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col h-[500px]">
            {/* Header with purple theme */}
            <div className="bg-gradient-to-r from-purple-50 to-background p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-purple-800">
                        <Edit3 className="h-4 w-4 text-purple-600" />
                        {config.title}
                    </h3>
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        <FileText className="h-3 w-3 mr-1" />
                        Content Tools
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>

            {/* Quick Tools Bar */}
            <div className="px-4 py-3 border-b flex items-center gap-2 overflow-x-auto bg-muted/30">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Quick:</span>
                {EDITOR_TOOLS.map((tool) => (
                    <Button
                        key={tool.label}
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1 whitespace-nowrap hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                    >
                        <tool.icon className="h-3 w-3" />
                        {tool.label}
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
