'use client';

import { useEffect } from 'react';
import { useChatbotContext } from '@/contexts/chatbot-context';

interface ChatbotPageContextProps {
    dispensaryId?: string;
    brandId?: string;
    entityName?: string;
    entityType?: 'dispensary' | 'brand' | 'zip' | 'general';
}

/**
 * Client component to set chatbot context for the current page.
 * Place this in any page to customize chatbot behavior for that page.
 * Context is automatically cleared when navigating away.
 */
export function ChatbotPageContext({ dispensaryId, brandId, entityName, entityType }: ChatbotPageContextProps) {
    const { setPageContext, clearPageContext } = useChatbotContext();

    useEffect(() => {
        setPageContext({ dispensaryId, brandId, entityName, entityType });

        // Clear context when component unmounts (page navigation)
        return () => clearPageContext();
    }, [dispensaryId, brandId, entityName, entityType, setPageContext, clearPageContext]);

    // This component doesn't render anything
    return null;
}
