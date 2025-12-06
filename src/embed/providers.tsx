'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

// Create a client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

export function EmbedProviders({
    children,
    primaryColor
}: {
    children: React.ReactNode;
    primaryColor?: string;
}) {
    // Start with a simpler provider set specifically for the embed
    // We might not need the full FirebaseAuthProvider if the chat is anonymous for now
    // or we can mock/lite version it.

    // Inject dynamic primary color if provided
    React.useEffect(() => {
        if (primaryColor) {
            document.documentElement.style.setProperty('--primary', primaryColor);
            // You might need to convert hex to HSL for full Tailwind support if you use HSL variables
        }
    }, [primaryColor]);

    return (
        <QueryClientProvider client={queryClient}>
            {/* Force light or dark mode based on config? Or system? Defaulting to system/attribute */}
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
                <TooltipProvider>
                    {children}
                    <Toaster />
                </TooltipProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
