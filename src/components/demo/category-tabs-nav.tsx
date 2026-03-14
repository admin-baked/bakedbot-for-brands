'use client';

/**
 * CategoryTabsNav — Sticky horizontal category navigation
 *
 * Renders a scrollable pill-tab row for each product category.
 * - "All" tab shows the flat filtered grid
 * - Category tab scrolls to that section (when in default view)
 *   or sets a category filter (when search is active)
 */

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Leaf, Wind, Cookie, Sparkles, Droplet, Heart, Package, Shirt, Tag, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CategoryTab {
    id: string;       // e.g. "flower"
    name: string;     // Display name e.g. "Flower"
    count: number;
}

interface CategoryTabsNavProps {
    categories: CategoryTab[];
    activeCategory: string;   // "all" | category name
    onSelect: (category: string) => void;
    primaryColor?: string;
    className?: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'All': Tag,
    'Offers': Zap,
    'Flower': Leaf,
    'Pre-Rolls': Wind,
    'Pre-Roll': Wind,
    'Vapes': Wind,
    'Edibles': Cookie,
    'Concentrates': Sparkles,
    'Tinctures': Droplet,
    'Topicals': Heart,
    'Accessories': Package,
    'Merchandise': Shirt,
    'Apparel': Shirt,
};

function getCategoryIcon(name: string): LucideIcon {
    return CATEGORY_ICONS[name] || Package;
}

export function CategoryTabsNav({
    categories,
    activeCategory,
    onSelect,
    primaryColor = '#16a34a',
    className,
}: CategoryTabsNavProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);

    // Scroll active tab into view when it changes
    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const el = activeRef.current;
            const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
            container.scrollTo({ left, behavior: 'smooth' });
        }
    }, [activeCategory]);

    const tabs = [
        { id: 'all', name: 'All', count: categories.reduce((s, c) => s + c.count, 0) },
        ...categories,
    ];

    return (
        <div
            className={cn(
                'sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border',
                className,
            )}
        >
            <div
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-hide gap-1 px-4 py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {tabs.map((tab) => {
                    const isActive = activeCategory === tab.id || activeCategory === tab.name;
                    const Icon = getCategoryIcon(tab.name);

                    return (
                        <button
                            key={tab.id}
                            ref={isActive ? activeRef : undefined}
                            onClick={() => onSelect(tab.name === 'All' ? 'all' : tab.name)}
                            className={cn(
                                'flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium transition-all shrink-0',
                                isActive
                                    ? 'text-white shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                            )}
                            style={isActive ? { backgroundColor: primaryColor } : undefined}
                        >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span>{tab.name}</span>
                            <span
                                className={cn(
                                    'text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center',
                                    isActive ? 'bg-white/20' : 'bg-background',
                                )}
                            >
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
