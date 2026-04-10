'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot } from 'lucide-react';
import type { Product as DomainProduct } from '@/types/domain';
import Chatbot from '@/components/chatbot';

interface BudtenderTabProps {
    domainProducts: DomainProduct[];
    brandId?: string;
    chatbotConfig?: {
        enabled?: boolean;
        welcomeMessage?: string;
        botName?: string;
        mascotImageUrl?: string;
    };
}

export function BudtenderTab({ domainProducts, brandId, chatbotConfig }: BudtenderTabProps) {
    const [budtenderOpen, setBudtenderOpen] = useState(false);

    if (domainProducts.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No products to test</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Sync your products first to test Smokey with your catalog.
                    </p>
                    <Button asChild variant="outline">
                        <a href="/dashboard/products">Go to Products</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Status Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium">
                            Smokey is loaded with {domainProducts.length} product{domainProducts.length !== 1 ? 's' : ''} from your catalog
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        Chat with Smokey as your customers would. Ask for product recommendations, strain effects, THC/CBD info, and upsells.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>&#8226; Product recommendations</div>
                        <div>&#8226; Strain & effect info</div>
                        <div>&#8226; THC/CBD comparisons</div>
                        <div>&#8226; Upsell suggestions</div>
                        <div>&#8226; Compliance-safe responses</div>
                        <div>&#8226; Customer segmentation</div>
                    </div>
                </CardContent>
            </Card>

            {/* Open Chat Button */}
            <div className="space-y-2">
                <Button
                    size="lg"
                    onClick={() => setBudtenderOpen(true)}
                    className="gap-2 w-full"
                >
                    <Bot className="h-5 w-5" />
                    Open Smokey Chat
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    The chat window will appear in the bottom-right corner, exactly as customers see it.
                </p>
            </div>

            {/* Chatbot component */}
            {brandId && (
                <Chatbot
                    products={domainProducts}
                    brandId={brandId}
                    initialOpen={budtenderOpen}
                    chatbotConfig={chatbotConfig}
                />
            )}
        </div>
    );
}
