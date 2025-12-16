'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * ChatbotContext - Provides page-specific context to the global chatbot
 * 
 * Pages can set their context (dispensaryId, brandId, entityName) and the
 * chatbot will automatically use it for personalized recommendations.
 */

interface ChatbotContextType {
    // Current page context
    dispensaryId?: string;
    brandId?: string;
    entityName?: string;
    entityType?: 'dispensary' | 'brand' | 'zip' | 'general';

    // Products available on current page
    products?: any[];

    // Methods to update context
    setPageContext: (context: Partial<Omit<ChatbotContextType, 'setPageContext' | 'clearPageContext'>>) => void;
    clearPageContext: () => void;
}

const defaultContext: ChatbotContextType = {
    setPageContext: () => { },
    clearPageContext: () => { },
};

const ChatbotContext = createContext<ChatbotContextType>(defaultContext);

export function ChatbotContextProvider({ children }: { children: ReactNode }) {
    const [context, setContext] = useState<Omit<ChatbotContextType, 'setPageContext' | 'clearPageContext'>>({});

    const setPageContext = useCallback((newContext: Partial<Omit<ChatbotContextType, 'setPageContext' | 'clearPageContext'>>) => {
        setContext(prev => ({ ...prev, ...newContext }));
    }, []);

    const clearPageContext = useCallback(() => {
        setContext({});
    }, []);

    return (
        <ChatbotContext.Provider value={{ ...context, setPageContext, clearPageContext }}>
            {children}
        </ChatbotContext.Provider>
    );
}

/**
 * Hook to access chatbot context
 */
export function useChatbotContext() {
    return useContext(ChatbotContext);
}

/**
 * Hook for pages to set their context - automatically clears on unmount
 */
export function useSetChatbotContext(context: Partial<Omit<ChatbotContextType, 'setPageContext' | 'clearPageContext'>>) {
    const { setPageContext, clearPageContext } = useChatbotContext();

    React.useEffect(() => {
        setPageContext(context);
        return () => clearPageContext();
    }, [context.dispensaryId, context.brandId, context.entityName, context.entityType]);
}
