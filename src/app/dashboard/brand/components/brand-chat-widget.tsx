'use client';

import { PuffChat } from '@/app/dashboard/ceo/components/puff-chat';
import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';

export function BrandChatWidget() {
    const { user, isUserLoading } = useUser();

    const BRAND_PROMPTS = [
        "Find dispensaries to carry my products",
        "See where my brand appears online",
        "Draft a campaign in 30 seconds",
        "Spy on competitor pricing",
        "See this week's wins & opportunities"
    ];

    // Show loading state while checking auth
    if (isUserLoading) {
        return (
            <Card className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    // Show message if not authenticated
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
                    promptSuggestions={BRAND_PROMPTS}
                    hideHeader={true}
                    isAuthenticated={!!user}
                    className="h-full border-0 shadow-none rounded-none"
                />
            </div>
        </Card>
    );
}
