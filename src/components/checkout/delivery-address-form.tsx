/**
 * Delivery Address Form Component
 *
 * Collects delivery address, validates zone eligibility, calculates fees,
 * and allows time slot selection for NY OCM-compliant delivery orders
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShippingAddress } from '@/types/orders';

interface DeliveryAddressFormProps {
    locationId: string;
    subtotal: number;
    onComplete: (data: DeliveryFormData) => void;
    onBack: () => void;
    className?: string;
}

export interface DeliveryFormData {
    address: ShippingAddress;
    deliveryWindow: { start: Date; end: Date };
    deliveryInstructions?: string;
    deliveryFee: number;
    zoneId: string;
    zoneName: string;
}

interface FeeCalculation {
    success: boolean;
    calculation?: {
        zone: {
            id: string;
            name: string;
            radiusMiles: number;
        };
        deliveryFee: number;
        minimumOrder: number;
        estimatedTime: string;
        meetsMinimum: boolean;
    };
    error?: string;
}

// Generate delivery time slots (2-hour windows)
function generateTimeSlots(): Array<{ label: string; start: Date; end: Date }> {
    const slots: Array<{ label: string; start: Date; end: Date }> = [];
    const now = new Date();
    const currentHour = now.getHours();

    // ASAP slot (current time + 45 min to current time + 90 min)
    const asapStart = new Date(now.getTime() + 45 * 60000);
    const asapEnd = new Date(now.getTime() + 90 * 60000);
    slots.push({
        label: 'ASAP (45-90 min)',
        start: asapStart,
        end: asapEnd,
    });

    // 2-hour windows starting from next available slot
    const startHour = currentHour + 2; // Start 2 hours from now
    for (let hour = startHour; hour <= 19; hour += 2) {
        // Stop at 7pm (19:00)
        if (hour >= 20) break; // NY OCM: no deliveries after 8pm

        const start = new Date(now);
        start.setHours(hour, 0, 0, 0);

        const end = new Date(start);
        end.setHours(hour + 2, 0, 0, 0);

        const startTime = start.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
        const endTime = end.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });

        slots.push({
            label: `${startTime} - ${endTime}`,
            start,
            end,
        });
    }

    return slots;
}

export function DeliveryAddressForm({
    locationId,
    subtotal,
    onComplete,
    onBack,
    className,
}: DeliveryAddressFormProps) {
    // Form state
    const [address, setAddress] = useState<ShippingAddress>({
        street: '',
        city: '',
        state: 'NY',
        zip: '',
        country: 'US',
    });
    const [deliveryInstructions, setDeliveryInstructions] = useState('');
    const [selectedSlot, setSelectedSlot] = useState<string>('');

    // Validation state
    const [feeCalculation, setFeeCalculation] = useState<FeeCalculation | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [timeSlots] = useState(generateTimeSlots());

    // Calculate delivery fee when address is complete
    useEffect(() => {
        const isAddressComplete =
            address.street && address.city && address.state === 'NY' && address.zip.length === 5;

        if (!isAddressComplete) {
            setFeeCalculation(null);
            return;
        }

        const calculateFee = async () => {
            setIsCalculating(true);
            setValidationError(null);

            try {
                const response = await fetch('/api/delivery/calculate-fee', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationId,
                        address,
                        subtotal,
                    }),
                });

                const result = (await response.json()) as FeeCalculation;
                setFeeCalculation(result);

                if (!result.success) {
                    setValidationError(result.error || 'Unable to calculate delivery fee');
                }
            } catch (error) {
                setValidationError('Network error. Please try again.');
                setFeeCalculation(null);
            } finally {
                setIsCalculating(false);
            }
        };

        // Debounce calculation by 500ms
        const timer = setTimeout(calculateFee, 500);
        return () => clearTimeout(timer);
    }, [address.street, address.city, address.state, address.zip, locationId, subtotal]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!feeCalculation?.success || !feeCalculation.calculation) {
            setValidationError('Please enter a valid delivery address in New York State');
            return;
        }

        if (!selectedSlot) {
            setValidationError('Please select a delivery time window');
            return;
        }

        const slot = timeSlots.find((s) => s.label === selectedSlot);
        if (!slot) return;

        onComplete({
            address,
            deliveryWindow: {
                start: slot.start,
                end: slot.end,
            },
            deliveryInstructions: deliveryInstructions || undefined,
            deliveryFee: feeCalculation.calculation.deliveryFee,
            zoneId: feeCalculation.calculation.zone.id,
            zoneName: feeCalculation.calculation.zone.name,
        });
    };

    const isFormValid =
        feeCalculation?.success &&
        feeCalculation.calculation?.meetsMinimum &&
        selectedSlot &&
        address.state === 'NY';

    return (
        <div className={cn('space-y-6', className)}>
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Delivery Address</h2>
                <p className="text-muted-foreground">
                    Enter your delivery address in New York State
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Address Input Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <CardTitle>Delivery Address</CardTitle>
                        </div>
                        <CardDescription>
                            We only deliver to addresses in New York State (NY OCM requirement)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="street">Street Address</Label>
                            <Input
                                id="street"
                                placeholder="123 Main St, Apt 4B"
                                value={address.street}
                                onChange={(e) =>
                                    setAddress((prev) => ({ ...prev, street: e.target.value }))
                                }
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="Syracuse"
                                    value={address.city}
                                    onChange={(e) =>
                                        setAddress((prev) => ({ ...prev, city: e.target.value }))
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="zip">ZIP Code</Label>
                                <Input
                                    id="zip"
                                    placeholder="13202"
                                    maxLength={5}
                                    value={address.zip}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setAddress((prev) => ({ ...prev, zip: value }));
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value="NY"
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    value="United States"
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Fee Calculation Status */}
                {isCalculating && (
                    <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertDescription>Calculating delivery fee...</AlertDescription>
                    </Alert>
                )}

                {validationError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                )}

                {feeCalculation?.success && feeCalculation.calculation && (
                    <>
                        {/* Delivery Zone Info */}
                        <Card className="border-primary/50 bg-primary/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <span className="font-semibold">Delivery Available</span>
                                    </div>
                                    <Badge variant="outline">
                                        {feeCalculation.calculation.zone.name}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            Delivery Fee:{' '}
                                            <span className="font-semibold">
                                                ${feeCalculation.calculation.deliveryFee.toFixed(2)}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            Est. Time:{' '}
                                            <span className="font-semibold">
                                                {feeCalculation.calculation.estimatedTime}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {!feeCalculation.calculation.meetsMinimum && (
                                    <Alert variant="destructive" className="mt-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Minimum order of $
                                            {feeCalculation.calculation.minimumOrder.toFixed(2)}{' '}
                                            required for delivery to this area. Your current subtotal
                                            is ${subtotal.toFixed(2)}.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>

                        {/* Time Slot Selection */}
                        {feeCalculation.calculation.meetsMinimum && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-primary" />
                                        <CardTitle>Delivery Time</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Choose when you'd like your order delivered
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot}>
                                        <div className="space-y-2">
                                            {timeSlots.map((slot) => (
                                                <div
                                                    key={slot.label}
                                                    className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                                                >
                                                    <RadioGroupItem
                                                        value={slot.label}
                                                        id={slot.label}
                                                    />
                                                    <Label
                                                        htmlFor={slot.label}
                                                        className="flex-1 cursor-pointer"
                                                    >
                                                        {slot.label}
                                                    </Label>
                                                    {slot.label.startsWith('ASAP') && (
                                                        <Badge variant="secondary">Fastest</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </RadioGroup>
                                </CardContent>
                            </Card>
                        )}

                        {/* Delivery Instructions */}
                        {feeCalculation.calculation.meetsMinimum && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Delivery Instructions</CardTitle>
                                    <CardDescription>
                                        Optional notes for the driver (gate code, parking, etc.)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        placeholder="Ring doorbell twice, leave at side door, etc."
                                        value={deliveryInstructions}
                                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                                        rows={3}
                                        maxLength={500}
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {deliveryInstructions.length}/500 characters
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={onBack}>
                        Back
                    </Button>
                    <Button type="submit" size="lg" disabled={!isFormValid} className="min-w-[200px]">
                        Continue to Payment
                    </Button>
                </div>

                {/* NY OCM Compliance Notice */}
                <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground text-center">
                        <span className="font-semibold">NY OCM Compliance:</span> Valid
                        government-issued ID (21+) will be verified at delivery before product
                        handoff. Delivery drivers cannot deliver to anyone under 21 years old.
                    </p>
                </div>
            </form>
        </div>
    );
}
