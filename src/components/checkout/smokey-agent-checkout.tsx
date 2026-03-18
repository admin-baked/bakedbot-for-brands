'use client';

// src/components/checkout/smokey-agent-checkout.tsx
// Full Smokey AI checkout drawer for claimed brand pages.
// Customer chats with Smokey to get recommendations → proceeds to SmokeyPay checkout.

import { useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Sparkles, ArrowRight } from 'lucide-react';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import { useStore } from '@/hooks/use-store';
import type { CheckoutRetailer } from './retailer-selector';

type Props = {
    open: boolean;
    orgId: string;
    retailers: CheckoutRetailer[];
    onClose: () => void;
    onProceedToCheckout: () => void;
};

export function SmokeyAgentCheckout({ open, orgId, retailers, onClose, onProceedToCheckout }: Props) {
    const { getItemCount, getCartTotal } = useStore();
    const itemCount = getItemCount();
    const { total } = getCartTotal();

    const locationHint = retailers.length === 1
        ? `at ${retailers[0].name}`
        : `across ${retailers.length} locations`;

    const smokeyPrompts = [
        "What's your best indica flower right now?",
        "I need something for sleep and relaxation",
        "Show me your top edibles under $25",
        "What do you recommend for first-time buyers?",
        "Add your top 3 products to my cart",
    ];

    const handleProceed = useCallback(() => {
        onProceedToCheckout();
    }, [onProceedToCheckout]);

    return (
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0">
                <SheetHeader className="px-4 pt-4 pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <SheetTitle className="text-base leading-tight">Smokey AI</SheetTitle>
                                <SheetDescription className="text-xs leading-tight">
                                    Your personal budtender {locationHint}
                                </SheetDescription>
                            </div>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            SmokeyPay Ready
                        </Badge>
                    </div>
                </SheetHeader>

                {/* Chat area */}
                <div className="flex-1 overflow-hidden">
                    <UnifiedAgentChat
                        role="public"
                        height="100%"
                        showHeader={false}
                        compact={true}
                        promptSuggestions={smokeyPrompts}
                        className="h-full border-0 rounded-none"
                    />
                </div>

                {/* Sticky checkout bar */}
                <div className="border-t bg-background px-4 py-3">
                    {itemCount > 0 ? (
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            size="lg"
                            onClick={handleProceed}
                        >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Checkout {itemCount} item{itemCount !== 1 ? 's' : ''} · ${total.toFixed(2)}
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <p className="text-center text-sm text-muted-foreground py-1">
                            Ask Smokey to add products to your cart
                        </p>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
