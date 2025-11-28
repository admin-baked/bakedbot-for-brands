/**
 * Payment Method Selector
 * Displays available payment options based on cart contents
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PaymentMethod, PaymentOption } from '@/lib/payments/config';

interface PaymentMethodSelectorProps {
    options: PaymentOption[];
    selected: PaymentMethod;
    onSelect: (method: PaymentMethod) => void;
}

export function PaymentMethodSelector({ options, selected, onSelect }: PaymentMethodSelectorProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Choose how you'd like to pay</CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup value={selected} onValueChange={(value) => onSelect(value as PaymentMethod)}>
                    {options.map((option) => (
                        <div key={option.id} className="flex items-start space-x-3 space-y-0">
                            <RadioGroupItem value={option.id} id={option.id} disabled={!option.isAvailable} />
                            <div className="flex-1">
                                <Label
                                    htmlFor={option.id}
                                    className={`cursor-pointer ${!option.isAvailable ? 'opacity-50' : ''}`}
                                >
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-sm text-muted-foreground">{option.description}</div>
                                </Label>
                            </div>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>
    );
}
