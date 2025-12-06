import React from 'react';
import { createRoot } from 'react-dom/client';
import { EmbedProviders } from './providers';
import Chatbot from '@/components/chatbot';
import '@/app/globals.css'; // Import global styles for the embed
import './embed.css'; // Import embed-specific styles

import { BakedBotConfig } from '@/types/embed';

// We import the global declaration for side effects (Window extension)
import '@/types/embed';

// Function to initialize the chatbot
function initBakedBot() {
    // Check if already initialized to prevent duplicates
    if (document.getElementById('bakedbot-root')) return;

    // Create container
    const container = document.createElement('div');
    container.id = 'bakedbot-root';
    document.body.appendChild(container);

    // Get config from window
    const config = window.BakedBotConfig || {};

    // Render
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <EmbedProviders primaryColor={config.primaryColor}>
                <Chatbot
                    brandId={config.brandId}
                    initialOpen={false}
                // We can pass other config props to Chatbot here if it supports them
                />
            </EmbedProviders>
        </React.StrictMode>
    );
}

// Auto-initialize if config exists, or expose init function
if (typeof window !== 'undefined') {
    if (document.readyState === 'complete') {
        initBakedBot();
    } else {
        window.addEventListener('load', initBakedBot);
    }
}

export { initBakedBot };
