import React, { useState, useEffect } from 'react';
import { getLandingGeoData, type LandingGeoData } from '@/server/actions/landing-geo';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';

// Storage keys
const DEMO_COUNT_KEY = 'bakedbot_demo_count';
const DEMO_DATE_KEY = 'bakedbot_demo_date';
const MAX_FREE_DEMOS = 5;

export function AgentPlayground() {
    const [demoMode, setDemoMode] = useState<'dispensary' | 'brand'>('dispensary');
    const [geoData, setGeoData] = useState<LandingGeoData | null>(null);
    const [isGeoLoading, setIsGeoLoading] = useState(false);

    // Fetch user location and nearby data on mount
    useEffect(() => {
        if (!navigator.geolocation) return;

        setIsGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const data = await getLandingGeoData(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    setGeoData(data);
                } catch (err) {
                    console.error('Failed to fetch geo data', err);
                } finally {
                    setIsGeoLoading(false);
                }
            },
            (err) => {
                console.warn('Geolocation denied or failed', err);
                setIsGeoLoading(false);
            }
        );
    }, []);

    const locationInfo = geoData?.location ? {
        dispensaryCount: geoData.retailers.length,
        brandCount: geoData.brands.length,
        city: geoData.location.city
    } : null;

    const prompts = demoMode === 'dispensary' ? [
        "Hire a Market Scout (Audit my local competition)",
        "Send Deebo (Check my compliance)", 
        "See my Digital Budtender in action",
        "What are the pricing plans?"
    ] : [
        "Hire a Market Scout (Find retail partners)",
        "Draft a New Drop Campaign",
        "Audit my Brand Footprint",
        "What are the pricing plans?"
    ];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            {/* Context Toggle */}
            <div className="flex justify-center">
                <div className="inline-flex bg-white/50 backdrop-blur-sm p-1 rounded-full border border-emerald-500/10 shadow-sm">
                    <button
                        onClick={() => setDemoMode('dispensary')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            demoMode === 'dispensary' 
                                ? 'bg-emerald-600 text-white shadow-md' 
                                : 'text-slate-600 hover:text-emerald-700'
                        }`}
                    >
                        Dispensary
                    </button>
                    <button
                        onClick={() => setDemoMode('brand')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            demoMode === 'brand' 
                                ? 'bg-purple-600 text-white shadow-md' 
                                : 'text-slate-600 hover:text-purple-700'
                        }`}
                    >
                        Brand
                    </button>
                </div>
            </div>

            <UnifiedAgentChat 
                role="public"
                locationInfo={locationInfo}
                promptSuggestions={prompts}
                className={`border-opacity-40 shadow-xl transition-colors duration-500 ${
                    demoMode === 'dispensary' ? 'border-emerald-500/20' : 'border-purple-500/20'
                }`}
            />
        </div>
    );
}
