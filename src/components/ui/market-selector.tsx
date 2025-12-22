'use client';

/**
 * MarketSelector - Reusable component for selecting a market/state
 * Used in onboarding and brand settings
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { getEnabledMarkets } from '@/lib/config/markets';
import { MapPin } from 'lucide-react';

interface MarketSelectorProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    description?: string;
    required?: boolean;
    className?: string;
    name?: string;
}

export function MarketSelector({
    value,
    onChange,
    label = 'Select Your Market',
    placeholder = 'Choose a state...',
    description,
    required = false,
    className = '',
    name = 'marketState'
}: MarketSelectorProps) {
    const markets = getEnabledMarkets();

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <Label htmlFor={name} className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {label}
                    {required && <span className="text-destructive">*</span>}
                </Label>
            )}

            <Select
                value={value}
                onValueChange={onChange}
                name={name}
            >
                <SelectTrigger id={name} className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {markets.map(market => (
                        <SelectItem
                            key={market.code}
                            value={market.code}
                        >
                            <span className="flex items-center gap-2">
                                <span className="font-medium">{market.code}</span>
                                <span className="text-muted-foreground">—</span>
                                <span>{market.name}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}

            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={value || ''} />
        </div>
    );
}
