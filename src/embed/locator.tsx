import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EmbedProviders } from './providers';
import DispensaryLocator from '@/components/dispensary-locator';
import '@/app/globals.css';
import './embed.css';

// Reuse the config interface but we mainly need brandId here
interface BakedBotConfig {
    brandId?: string;
    primaryColor?: string;
    // ... potentially other config
}

declare global {
    interface Window {
        BakedBotConfig?: BakedBotConfig;
    }
}

function LocatorEmbedRoot() {
    const config = window.BakedBotConfig || {};
    const [locations, setLocations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false); // Start false, or true if auto-fetch

    // TODO: Implement fetching logic based on config.brandId
    // For now, we might load empty or mock, or implement a fetch if an endpoint exists.
    // If brandId is provided, we should ideally fetch that brand's retailers.

    useEffect(() => {
        if (config.brandId) {
            setIsLoading(true);
            // Simulate fetch or call API
            // fetch(\`/api/brands/\${config.brandId}/retailers\`) ...
            // For now, let's leave it empty or mock to verify the embed loads.
            setTimeout(() => {
                setIsLoading(false);
            }, 1000);
        }
    }, [config.brandId]);


    return (
        <EmbedProviders primaryColor={config.primaryColor}>
            <div className="bakedbot-locator-embed p-4">
                <DispensaryLocator
                    locations={locations}
                    isLoading={isLoading}
                />
            </div>
        </EmbedProviders>
    );
}

function initLocator() {
    if (document.getElementById('bakedbot-locator-root')) return;

    // Check if there is a specific target div for the locator, otherwise append to body?
    // Usually locators are embedded IN a page, not floating. Can we find a specific container?
    // Let's look for a div with id "bakedbot-locator-container"
    let container = document.getElementById('bakedbot-locator-container');

    if (!container) {
        console.warn("BakedBot Locator: Container #bakedbot-locator-container not found. Appending to body (fallback).");
        container = document.createElement('div');
        container.id = 'bakedbot-locator-root'; // distinct ID if we create it
        document.body.appendChild(container);
    }

    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <LocatorEmbedRoot />
        </React.StrictMode>
    );
}

if (typeof window !== 'undefined') {
    if (document.readyState === 'complete') {
        initLocator();
    } else {
        window.addEventListener('load', initLocator);
    }
}

export { initLocator };
