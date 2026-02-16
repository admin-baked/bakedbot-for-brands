/**
 * Fulfillment Selection Component
 *
 * Allows customers to choose between pickup and delivery
 * First step in checkout flow after age verification
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Store, Truck, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FulfillmentSelectionProps {
    onSelect: (type: 'pickup' | 'delivery') => void;
    selectedType?: 'pickup' | 'delivery';
    deliveryEnabled?: boolean;
    className?: string;
}

export function FulfillmentSelection({
    onSelect,
    selectedType,
    deliveryEnabled = true,
    className,
}: FulfillmentSelectionProps) {
    return (
        <div className={cn('space-y-4', className)}>
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Choose Fulfillment Method</h2>
                <p className="text-muted-foreground">
                    How would you like to receive your order?
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pickup Option */}
                <Card
                    className={cn(
                        'cursor-pointer transition-all hover:shadow-lg',
                        selectedType === 'pickup'
                            ? 'ring-2 ring-primary border-primary'
                            : 'hover:border-primary/50'
                    )}
                    onClick={() => onSelect('pickup')}
                >
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <Store className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Pickup</CardTitle>
                                    <CardDescription>Pick up at store</CardDescription>
                                </div>
                            </div>
                            {selectedType === 'pickup' && (
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                    <svg
                                        className="h-4 w-4 text-white"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Ready in 30 minutes</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-green-600">Free</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                Show your ID at pickup. Valid government-issued ID required (21+).
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Option */}
                <Card
                    className={cn(
                        'cursor-pointer transition-all',
                        !deliveryEnabled && 'opacity-50 cursor-not-allowed',
                        deliveryEnabled && 'hover:shadow-lg',
                        selectedType === 'delivery'
                            ? 'ring-2 ring-primary border-primary'
                            : deliveryEnabled && 'hover:border-primary/50'
                    )}
                    onClick={() => deliveryEnabled && onSelect('delivery')}
                >
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <Truck className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl">Delivery</CardTitle>
                                    <CardDescription>
                                        {deliveryEnabled ? 'Delivered to your door' : 'Coming soon'}
                                    </CardDescription>
                                </div>
                            </div>
                            {selectedType === 'delivery' && (
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                    <svg
                                        className="h-4 w-4 text-white"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {deliveryEnabled ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>45-60 minutes</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-semibold">From $5.00</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">
                                    ID verification required at delivery. Must be 21+ with valid government-issued ID.
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Delivery service is not yet available. Please select pickup.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Continue Button */}
            {selectedType && (
                <div className="flex justify-end pt-4">
                    <Button
                        size="lg"
                        onClick={() => onSelect(selectedType)}
                        className="min-w-[200px]"
                    >
                        Continue with {selectedType === 'pickup' ? 'Pickup' : 'Delivery'}
                    </Button>
                </div>
            )}

            {/* NY OCM Compliance Notice */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                    <span className="font-semibold">NY OCM Compliance:</span> All orders require valid
                    government-issued ID showing you are 21 years or older. ID will be verified at pickup
                    or delivery.
                </p>
            </div>
        </div>
    );
}
