'use client';

/**
 * Upsell Configuration Component
 *
 * Settings for upsell engine: strategy weights, excluded products,
 * placement toggles, and pairing rules.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface UpsellConfigurationProps {
    orgId: string;
}

export function UpsellConfiguration({ orgId }: UpsellConfigurationProps) {
    const [weights, setWeights] = useState({
        terpeneEffectMatch: 30,
        marginContribution: 25,
        inventoryPriority: 20,
        categoryComplement: 15,
        priceFit: 10,
    });

    const [placements, setPlacements] = useState({
        productDetail: true,
        cart: true,
        checkout: true,
        chatbot: true,
    });

    const updateWeight = (key: keyof typeof weights, value: number) => {
        setWeights({ ...weights, [key]: value });
    };

    const resetDefaults = () => {
        setWeights({
            terpeneEffectMatch: 30,
            marginContribution: 25,
            inventoryPriority: 20,
            categoryComplement: 15,
            priceFit: 10,
        });
        setPlacements({
            productDetail: true,
            cart: true,
            checkout: true,
            chatbot: true,
        });
    };

    return (
        <div className="space-y-6">
            {/* Strategy Weights */}
            <Card>
                <CardHeader>
                    <CardTitle>Scoring Strategy Weights</CardTitle>
                    <CardDescription>
                        Adjust how the upsell engine prioritizes different pairing factors
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Terpene & Effect Match</Label>
                                <Badge variant="secondary">{weights.terpeneEffectMatch}%</Badge>
                            </div>
                            <Slider
                                value={[weights.terpeneEffectMatch]}
                                onValueChange={([v]) => updateWeight('terpeneEffectMatch', v)}
                                max={50}
                                step={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                How much to prioritize cannabis science (terpene profiles, effects)
                            </p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Margin Contribution</Label>
                                <Badge variant="secondary">{weights.marginContribution}%</Badge>
                            </div>
                            <Slider
                                value={[weights.marginContribution]}
                                onValueChange={([v]) => updateWeight('marginContribution', v)}
                                max={50}
                                step={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                Favor high-margin products (280E tax optimization)
                            </p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Inventory Priority</Label>
                                <Badge variant="secondary">{weights.inventoryPriority}%</Badge>
                            </div>
                            <Slider
                                value={[weights.inventoryPriority]}
                                onValueChange={([v]) => updateWeight('inventoryPriority', v)}
                                max={50}
                                step={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                Prioritize expiring or slow-moving inventory
                            </p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Category Complement</Label>
                                <Badge variant="secondary">{weights.categoryComplement}%</Badge>
                            </div>
                            <Slider
                                value={[weights.categoryComplement]}
                                onValueChange={([v]) => updateWeight('categoryComplement', v)}
                                max={50}
                                step={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                Cross-sell between categories (flower → edibles, vape → accessories)
                            </p>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Price Fit</Label>
                                <Badge variant="secondary">{weights.priceFit}%</Badge>
                            </div>
                            <Slider
                                value={[weights.priceFit]}
                                onValueChange={([v]) => updateWeight('priceFit', v)}
                                max={50}
                                step={5}
                            />
                            <p className="text-xs text-muted-foreground">
                                Match price range of anchor product (±30%)
                            </p>
                        </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
                        <div className="flex gap-2">
                            <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-900 dark:text-amber-100">
                                Total weight: {Object.values(weights).reduce((a, b) => a + b, 0)}%.
                                Weights are normalized internally, so total doesn't need to be 100%.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Placement Toggles */}
            <Card>
                <CardHeader>
                    <CardTitle>Upsell Placements</CardTitle>
                    <CardDescription>
                        Enable or disable upsell suggestions at different touchpoints
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Product Detail Page</Label>
                            <p className="text-xs text-muted-foreground">
                                "Pairs Well With" section below product info
                            </p>
                        </div>
                        <Switch
                            checked={placements.productDetail}
                            onCheckedChange={(checked) =>
                                setPlacements({ ...placements, productDetail: checked })
                            }
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Cart Sidebar</Label>
                            <p className="text-xs text-muted-foreground">
                                "Complete Your Order" suggestions in cart
                            </p>
                        </div>
                        <Switch
                            checked={placements.cart}
                            onCheckedChange={(checked) =>
                                setPlacements({ ...placements, cart: checked })
                            }
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Checkout Page</Label>
                            <p className="text-xs text-muted-foreground">
                                "Last Chance Deals" before payment
                            </p>
                        </div>
                        <Switch
                            checked={placements.checkout}
                            onCheckedChange={(checked) =>
                                setPlacements({ ...placements, checkout: checked })
                            }
                        />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Chatbot (Smokey)</Label>
                            <p className="text-xs text-muted-foreground">
                                AI-powered pairing suggestions in conversation
                            </p>
                        </div>
                        <Switch
                            checked={placements.chatbot}
                            onCheckedChange={(checked) =>
                                setPlacements({ ...placements, chatbot: checked })
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
                <Button className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                </Button>
                <Button variant="outline" onClick={resetDefaults}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                </Button>
            </div>
        </div>
    );
}
