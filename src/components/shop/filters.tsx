'use client';

/**
 * Shop Product Filters Component
 * Category, price, rating, distance, open now filters
 */

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface ShopFilters {
    category?: string;
    maxPrice?: number;
    minRating?: number;
    maxMinutes?: number;
    openNow?: boolean;
    effects?: string[];
}

interface ShopFiltersProps {
    filters: ShopFilters;
    onFiltersChange: (filters: ShopFilters) => void;
}

const CATEGORIES = [
    { value: 'flower', label: 'Flower' },
    { value: 'edibles', label: 'Edibles' },
    { value: 'vapes', label: 'Vapes' },
    { value: 'concentrates', label: 'Concentrates' },
    { value: 'pre-rolls', label: 'Pre-Rolls' },
    { value: 'tinctures', label: 'Tinctures' },
];

const EFFECTS = [
    'Relaxing', 'Energizing', 'Creative', 'Sleepy', 'Focused', 'Uplifting'
];

export function ShopFilters({ filters, onFiltersChange }: ShopFiltersProps) {
    const [open, setOpen] = useState(false);

    const activeFilterCount = Object.values(filters).filter(v =>
        v !== undefined && v !== null && v !== false &&
        !(Array.isArray(v) && v.length === 0)
    ).length;

    const updateFilter = (key: keyof ShopFilters, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onFiltersChange({});
    };

    const toggleEffect = (effect: string) => {
        const current = filters.effects || [];
        const updated = current.includes(effect.toLowerCase())
            ? current.filter(e => e !== effect.toLowerCase())
            : [...current, effect.toLowerCase()];
        updateFilter('effects', updated);
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Quick category pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                    <Badge
                        key={cat.value}
                        variant={filters.category === cat.value ? 'default' : 'outline'}
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => updateFilter('category',
                            filters.category === cat.value ? undefined : cat.value
                        )}
                    >
                        {cat.label}
                    </Badge>
                ))}
            </div>

            {/* Open Now toggle */}
            <div className="flex items-center gap-2 px-3 py-1 border rounded-full">
                <Switch
                    id="openNow"
                    checked={filters.openNow || false}
                    onCheckedChange={(checked) => updateFilter('openNow', checked)}
                />
                <Label htmlFor="openNow" className="text-sm cursor-pointer">Open Now</Label>
            </div>

            {/* More Filters Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="relative">
                        <Filter className="w-4 h-4 mr-1" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle className="flex items-center justify-between">
                            Filters
                            {activeFilterCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    <X className="w-4 h-4 mr-1" />
                                    Clear All
                                </Button>
                            )}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-6 mt-6">
                        {/* Category */}
                        <div>
                            <Label className="mb-2 block">Category</Label>
                            <Select
                                value={filters.category || ''}
                                onValueChange={(v) => updateFilter('category', v || undefined)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Categories</SelectItem>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Max Price */}
                        <div>
                            <Label className="mb-2 block">
                                Max Price: ${filters.maxPrice || 100}
                            </Label>
                            <Slider
                                value={[filters.maxPrice || 100]}
                                onValueChange={([v]) => updateFilter('maxPrice', v)}
                                min={10}
                                max={200}
                                step={10}
                            />
                        </div>

                        {/* Min Rating */}
                        <div>
                            <Label className="mb-2 block">
                                Min Rating: {filters.minRating || 0}★
                            </Label>
                            <Slider
                                value={[filters.minRating || 0]}
                                onValueChange={([v]) => updateFilter('minRating', v)}
                                min={0}
                                max={5}
                                step={0.5}
                            />
                        </div>

                        {/* Max Travel Time */}
                        <div>
                            <Label className="mb-2 block">
                                Max Travel Time: {filters.maxMinutes || 30} min
                            </Label>
                            <Slider
                                value={[filters.maxMinutes || 30]}
                                onValueChange={([v]) => updateFilter('maxMinutes', v)}
                                min={5}
                                max={60}
                                step={5}
                            />
                        </div>

                        {/* Effects */}
                        <div>
                            <Label className="mb-2 block">Effects</Label>
                            <div className="flex flex-wrap gap-2">
                                {EFFECTS.map(effect => (
                                    <Badge
                                        key={effect}
                                        variant={filters.effects?.includes(effect.toLowerCase()) ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => toggleEffect(effect)}
                                    >
                                        {effect}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}

export default ShopFilters;
