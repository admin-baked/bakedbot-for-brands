'use client';

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useDynamicPrompts } from '@/hooks/use-dynamic-prompts';
import { BRAND_CHAT_CONFIG } from '@/lib/chat/role-chat-config';

export function BrandChatWidget() {
    const { user, isUserLoading } = useUser();

    // Merge live CRM/intel/alert data with the static pool.
    // 4 chips total: up to 2 data-driven, remainder from shuffled static pool.
    // Hook called unconditionally (Rules of Hooks).
    const orgId = (user as any)?.orgId ?? (user as any)?.uid ?? null;
    const { prompts: brandPrompts } = useDynamicPrompts(
        orgId,
        BRAND_CHAT_CONFIG.promptSuggestions,
        4,
        2
    );

    if (isUserLoading) {
        return (
            <Card className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    if (!user) {
        return (
            <Card className="h-[400px]">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Revenue Ops Assistant
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground text-center">
                        Please sign in to use the AI assistant.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <div className="h-[500px]">
                <PuffChat
                    initialTitle="Revenue Ops Assistant"
                    promptSuggestions={brandPrompts}
                    hideHeader={true}
                    isAuthenticated={!!user}
                    className="h-full border-0 shadow-none rounded-none"
                />
            </div>
        </Card>
    );
}
