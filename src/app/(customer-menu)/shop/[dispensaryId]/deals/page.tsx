'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { DispensaryHeader } from '@/components/dispensary/dispensary-header';
import { CategoryNav } from '@/components/dispensary/category-nav';
import { DealCard } from '@/components/dispensary/deal-card';
import { BundleDeal } from '@/types/bundles';
import { BundleBuilder } from '@/components/dispensary/bundle-builder';
import { FloatingCartButton } from '@/components/floating-cart-button';

// Mock data for initial development - will be replaced by API call
const MOCK_DEALS: BundleDeal[] = [
    {
        id: 'deal-1',
        name: 'Camino 3 for $49.99',
        description: 'Mix and match any 3 Camino gummies for one low price. Experience the full range of effects.',
        type: 'mix_match',
        status: 'active',
        createdBy: 'dispensary',
        products: [], // Loaded dynamically in builder
        originalTotal: 66.00,
        bundlePrice: 49.99,
        savingsAmount: 16.01,
        savingsPercent: 24,
        currentRedemptions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        orgId: 'org-1',
        badgeText: 'Most Popular',
        featured: true,
        imageUrl: '/images/camino-bundle.png' // Replace with real asset if available or let fallback handle it
    },
    {
        id: 'deal-2',
        name: 'Jeeter 2 for $80',
        description: 'Get any two Jeeter infused pre-roll packs. The perfect party request.',
        type: 'tiered',
        status: 'active',
        createdBy: 'brand',
        products: [],
        originalTotal: 100.00,
        bundlePrice: 80.00,
        savingsAmount: 20.00,
        savingsPercent: 20,
        currentRedemptions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        orgId: 'org-1',
        badgeText: 'Brand Deal',
        featured: true
    }
];

export default function DealsPage() {
    const params = useParams();
    const [selectedDeal, setSelectedDeal] = useState<BundleDeal | null>(null);

    const handleViewDeal = (deal: BundleDeal) => {
        setSelectedDeal(deal);
    };

    const handleCloseBuilder = () => {
        setSelectedDeal(null);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <DispensaryHeader brandName="Dispensary Name" />
            <CategoryNav />

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Exclusive Deals</h1>
                    <p className="text-muted-foreground text-lg">
                        Unlock huge savings with our curated bundles and offers.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_DEALS.map((deal) => (
                        <DealCard
                            key={deal.id}
                            deal={deal}
                            onViewDeal={handleViewDeal}
                        />
                    ))}
                </div>
            </div>

            {/* Bundle Builder Modal */}
            {selectedDeal && (
                <BundleBuilder
                    deal={selectedDeal}
                    open={!!selectedDeal}
                    onOpenChange={(open) => !open && handleCloseBuilder()}
                />
            )}

            <FloatingCartButton />
        </div>
    );
}
