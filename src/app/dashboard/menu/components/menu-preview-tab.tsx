'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, ExternalLink, Maximize2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BrandMenuClient } from '@/app/[brand]/brand-menu-client';
import type { Product as DomainProduct, Retailer, Brand } from '@/types/domain';
import type { BundleDeal } from '@/types/bundles';
import type { FeaturedBrand } from '@/server/actions/featured-brands';
import type { Carousel } from '@/types/carousels';
import type { PublicMenuSettings } from '@/components/demo/menu-info-bar';
import type { BrandPageType } from '@/types/brand-pages';
import { PagePublishToggle } from './page-publish-toggle';

interface PreviewData {
    brand: Brand | null;
    bundles: BundleDeal[];
    featuredBrands: FeaturedBrand[];
    carousels: Carousel[];
    publicMenuSettings: PublicMenuSettings | null;
    brandSlug: string;
}

interface MenuPreviewTabProps {
    previewData: PreviewData | null;
    previewLoading: boolean;
    domainProducts: DomainProduct[];
    loading: boolean;
    onProductReorder: (updates: { id: string; sortOrder: number }[]) => Promise<void>;
    onToggleFeatured: (productId: string, featured: boolean) => Promise<void>;
    onFullScreen: () => void;
    // Publish state
    orgId: string;
    isPublished: boolean;
    updatedAt: string | null;
    onPublishToggle: (pageType: BrandPageType, isPublished: boolean) => void;
}

export function MenuPreviewTab({
    previewData, previewLoading, domainProducts, loading,
    onProductReorder, onToggleFeatured, onFullScreen,
    orgId, isPublished, updatedAt, onPublishToggle,
}: MenuPreviewTabProps) {
    if (previewLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p className="text-sm">Loading your live menu...</p>
            </div>
        );
    }

    if (!previewData?.brand) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No brand page found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Complete your brand setup to enable the live preview.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/brand-page">Set Up Brand Page</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Publish status + controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <PagePublishToggle
                    orgId={orgId}
                    pageType="menu"
                    isPublished={isPublished}
                    updatedAt={updatedAt}
                    onToggle={onPublishToggle}
                />
                <div className="flex items-center gap-2">
                    {previewData.brandSlug && (
                        <a
                            href={`https://bakedbot.ai/${previewData.brandSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Live Site
                        </a>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onFullScreen}
                        className="gap-2"
                    >
                        <Maximize2 className="h-4 w-4" />
                        Full Screen
                    </Button>
                </div>
            </div>

            {/* Preview banner */}
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-800 flex-1">
                    <span className="font-medium">Live Preview</span> — this is exactly what your customers see.
                    Hover products to edit price, manage bundles, or chat with AI about any product.
                </p>
            </div>

            {/* Full storefront preview */}
            <div className="rounded-xl border overflow-hidden shadow-sm">
                <BrandMenuClient
                    brand={previewData.brand}
                    products={domainProducts}
                    retailers={[] as Retailer[]}
                    brandSlug={previewData.brandSlug}
                    bundles={previewData.bundles}
                    featuredBrands={previewData.featuredBrands}
                    carousels={previewData.carousels}
                    publicMenuSettings={previewData.publicMenuSettings}
                    isManageMode={true}
                    onProductReorder={onProductReorder}
                    onToggleFeatured={onToggleFeatured}
                />
            </div>
        </div>
    );
}
