'use client';

// src/components/landing/demo-chat-trigger.tsx
/**
 * Button to launch Smokey chatbot on the homepage
 */

import { useState } from 'react';
import dynamicImport from 'next/dynamic';
import { demoProducts } from '@/lib/demo/demo-data';
import { Product } from '@/types/domain';
import styles from '@/app/home.module.css';
import { MessageCircle } from 'lucide-react';

// Dynamic import to prevent Firebase issues
const Chatbot = dynamicImport(() => import('@/components/chatbot'), { ssr: false });

// Convert demo products to the Product type expected by the Chatbot
const demoChatProducts: Product[] = demoProducts.map(p => ({
    ...p,
    brandId: 'demo-40tons',
}));

export function DemoChatTrigger() {
    const [showChat, setShowChat] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowChat(true)}
                className={styles.btnSecondary}
            >
                <MessageCircle size={16} />
                Try Smokey, AI Budtender
            </button>

            {showChat && (
                <Chatbot
                    products={demoChatProducts}
                    brandId="demo-40tons"
                    initialOpen={true}
                />
            )}
        </>
    );
}
