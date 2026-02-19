'use client';

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2 } from 'lucide-react';
import { useDynamicPrompts } from '@/hooks/use-dynamic-prompts';
import { DISPENSARY_CHAT_CONFIG } from '@/lib/chat/role-chat-config';

export function DispensaryChatWidget() {
    const { user, isUserLoading } = useUser();

    // Merge live CRM/intel/alert data with the static pool.
    // 4 chips total: up to 2 data-driven, remainder from shuffled static pool.
    // Priority: onboarding nudges → CI/CRM signals → static pool.
    // Hook called unconditionally (Rules of Hooks).
    const orgId = (user as any)?.orgId ?? (user as any)?.uid ?? null;
    const userId = user?.uid ?? null;
    const { prompts: dispensaryPrompts } = useDynamicPrompts(
        orgId,
        DISPENSARY_CHAT_CONFIG.promptSuggestions,
        4,
        2,
        userId
    );

    if (isUserLoading) {
        return (
            <div className="flex items-center justify-center h-[480px]">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-[480px]">
                <p className="text-muted-foreground text-sm text-center">
                    Please sign in to use the AI assistant.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[480px]">
            <PuffChat
                initialTitle="Ops Assistant"
                promptSuggestions={dispensaryPrompts}
                className="h-full border-none shadow-none rounded-none"
                isAuthenticated={!!user}
            />
        </div>
    );
}
