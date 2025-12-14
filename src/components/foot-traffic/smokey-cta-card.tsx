
'use client';

import { MessageSquare, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trackEvent } from '@/lib/analytics';
import Image from 'next/image';

interface SmokeyCtaCardProps {
    zipCode: string;
    city: string;
    state: string;
}

export function SmokeyCtaCard({ zipCode, city, state }: SmokeyCtaCardProps) {
    const handleChatClick = () => {
        trackEvent({
            name: 'talk_to_smokey_click',
            properties: {
                zip: zipCode,
                source: 'local_page',
                placement: 'right_rail'
            }
        });

        // Trigger the chat widget (assuming there's a global event or window method)
        // For now, we'll dispatch a custom event that the chat widget listens to
        window.dispatchEvent(new CustomEvent('open-smokey-chat'));
    };

    return (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                        {/* Placeholder for Smokey Avatar - using a generic bot icon for now if image not available */}
                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-100 text-indigo-600">
                            <Sparkles className="h-6 w-6" />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-lg text-indigo-950">Unsure what to buy?</CardTitle>
                        <p className="text-xs text-indigo-700/80 font-medium">Smokey knows {city}.</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-indigo-900/80">
                    <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>Find the best deals near {zipCode}</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        <span>Get personalized product recs</span>
                    </li>
                </ul>

                <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    onClick={handleChatClick}
                >
                    Chat with Smokey
                </Button>
            </CardContent>
        </Card>
    );
}
