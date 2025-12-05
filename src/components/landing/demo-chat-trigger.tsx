'use client';

import { useState } from 'react';
import Chatbot from '@/components/chatbot';
import { demoProducts } from '@/lib/demo/demo-data';
import { Product } from '@/types/domain';
import styles from '@/app/home.module.css';
import { MessageCircle } from 'lucide-react';

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
                Try the AI Budtender
            </button>

            {showChat && (
                <Chatbot products={demoChatProducts} brandId="demo-40tons" />
            )}
        </>
    );
}
