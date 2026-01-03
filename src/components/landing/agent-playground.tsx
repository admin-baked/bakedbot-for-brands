import React, { useState, useEffect } from 'react';
import { getLandingGeoData, type LandingGeoData } from '@/server/actions/landing-geo';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';

// Storage keys
const DEMO_COUNT_KEY = 'bakedbot_demo_count';
const DEMO_DATE_KEY = 'bakedbot_demo_date';
const MAX_FREE_DEMOS = 5;

export function AgentPlayground() {
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

    return (
        <div className="w-full max-w-4xl mx-auto">
            <UnifiedAgentChat 
                role="public"
                locationInfo={locationInfo}
                promptSuggestions={[
                    "Hire a Market Scout (audit my competition)",
                    "Send Deebo (compliance check)",
                    "See my Digital Budtender in action",
                    "What are the pricing plans?"
                ]}
                className="border-emerald-500/20 shadow-xl"
            />
        </div>
    );
}
