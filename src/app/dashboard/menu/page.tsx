
// src/app/dashboard/menu/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Eye, MapPin, Search, Bot, Zap, Minimize2, ExternalLink, BookOpen
} from 'lucide-react';
import Link from 'next/link';

import { logger } from '@/lib/logger';
import {
    getMenuData, getMenuPreviewData, updateProductSortOrder, toggleProductFeatured,
} from './actions';
import { getPagesData, type PageStatus, type PagesData } from './page-actions';
import { useUserRole } from '@/hooks/use-user-role';
import { normalizeCategoryName } from '@/lib/utils/product-image';
import { BrandMenuClient } from '@/app/[brand]/brand-menu-client';
import type { Product as DomainProduct, Retailer } from '@/types/domain';
import type { BrandPageType, LocationInfo, ZipSeoPageContent } from '@/types/brand-pages';
import { ThemeManager } from '@/components/dashboard/theme-manager';

// Extracted tab components
import { PagesHeader } from './components/pages-header';
import { MenuPreviewTab } from './components/menu-preview-tab';
import { LocationsTab } from './components/locations-tab';
import { ZipSeoTab } from './components/zip-seo-tab';
import { BudtenderTab } from './components/budtender-tab';

type ActiveTab = 'menu' | 'locations' | 'zip-seo' | 'budtender' | 'themes';

export default function MenuPage() {
    const { orgId } = useUserRole();

    // Domain products (shared: preview + budtender)
    const [domainProducts, setDomainProducts] = useState<DomainProduct[]>([]);
    const [loading, setLoading] = useState(true);

    // Preview data
    const [previewData, setPreviewData] = useState<{
        brand: import('@/types/domain').Brand | null;
        bundles: import('@/types/bundles').BundleDeal[];
        featuredBrands: import('@/server/actions/featured-brands').FeaturedBrand[];
        carousels: import('@/types/carousels').Carousel[];
        publicMenuSettings: import('@/components/demo/menu-info-bar').PublicMenuSettings | null;
        brandSlug: string;
    } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewFetchedRef = useRef(false);

    // Page state
    const [fullScreen, setFullScreen] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
    const [pageStatuses, setPageStatuses] = useState<PageStatus[]>([]);
    const [locations, setLocations] = useState<LocationInfo[]>([]);
    const [zipSeoContent, setZipSeoContent] = useState<ZipSeoPageContent | null>(null);

    // ── Load domain products ──
    const loadProducts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMenuData();
            const domain: DomainProduct[] = data.products.map((p: any) => ({
                id: p.id || p.cann_sku_id,
                name: p.name || p.product_name,
                category: normalizeCategoryName(p.category),
                price: p.price || p.latest_price || 0,
                imageUrl: p.imageUrl || p.image_url || '/icon-192.png',
                imageHint: p.imageHint || p.category || 'product',
                description: p.description || '',
                brandId: p.brandId || '',
                brandName: p.brandName || p.brand_name,
                thcPercent: p.thcPercent || p.percentage_thc,
                cbdPercent: p.cbdPercent || p.percentage_cbd,
                stock: p.stockCount,
                inStock: p.inStock,
                cost: p.cost,
                effects: p.effects || [],
                sortOrder: p.sortOrder,
                featured: p.featured,
                source: p.source || 'pos',
            }));
            setDomainProducts(domain);
        } catch (error) {
            logger.error('Failed to load products:', error instanceof Error ? error : new Error(String(error)));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPreviewData = useCallback(async () => {
        if (previewFetchedRef.current) return;
        previewFetchedRef.current = true;
        setPreviewLoading(true);
        try {
            const data = await getMenuPreviewData();
            setPreviewData(data);
        } catch (error) {
            logger.error('Failed to load preview data:', error instanceof Error ? error : new Error(String(error)));
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    // Load page statuses + content in one call (eliminates N+1)
    const loadPagesData = useCallback(async () => {
        if (!orgId) return;
        try {
            const data = await getPagesData(orgId);
            setPageStatuses(data.statuses);
            setLocations(data.locations);
            setZipSeoContent(data.zipSeoContent);
        } catch (error) {
            logger.error('Failed to load pages data:', error instanceof Error ? error : new Error(String(error)));
        }
    }, [orgId]);

    // Single mount effect — all three fetches run in parallel
    useEffect(() => {
        loadProducts();
        loadPreviewData();
        loadPagesData();
    }, [loadProducts, loadPreviewData, loadPagesData]);

    // ── Manage mode callbacks ──
    const handleProductReorder = async (updates: { id: string; sortOrder: number }[]) => {
        const result = await updateProductSortOrder(updates);
        if (!result.success) throw new Error(result.error);
        setDomainProducts(prev => {
            const orderMap = new Map(updates.map(u => [u.id, u.sortOrder]));
            return prev.map(p => orderMap.has(p.id) ? { ...p, sortOrder: orderMap.get(p.id) } : p);
        });
    };

    const handleToggleFeatured = async (productId: string, featured: boolean) => {
        const result = await toggleProductFeatured(productId, featured);
        if (!result.success) throw new Error(result.error);
        setDomainProducts(prev => prev.map(p => p.id === productId ? { ...p, featured } : p));
    };

    const handlePublishToggle = (pageType: BrandPageType, isPublished: boolean) => {
        setPageStatuses(prev =>
            prev.map(s => s.pageType === pageType ? { ...s, isPublished } : s)
        );
    };

    // Status helpers
    const getStatus = (pageType: BrandPageType) =>
        pageStatuses.find(s => s.pageType === pageType);

    // ── Full-screen preview overlay ──
    if (fullScreen && previewData?.brand) {
        return (
            <div className="fixed inset-0 z-50 bg-background overflow-auto">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium">Live Preview — exactly what customers see</span>
                        <a
                            href={`https://bakedbot.ai/${previewData.brandSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Live
                        </a>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFullScreen(false)}
                        className="gap-2"
                    >
                        <Minimize2 className="h-4 w-4" />
                        Exit Full Screen
                    </Button>
                </div>
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
                    onProductReorder={handleProductReorder}
                    onToggleFeatured={handleToggleFeatured}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PagesHeader
                brandSlug={previewData?.brandSlug ?? null}
                pageStatuses={pageStatuses}
            />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="menu" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Menu
                        </TabsTrigger>
                        <TabsTrigger value="locations" className="gap-2">
                            <MapPin className="h-4 w-4" />
                            Locations
                        </TabsTrigger>
                        <TabsTrigger value="zip-seo" className="gap-2">
                            <Search className="h-4 w-4" />
                            Zip Code SEO
                        </TabsTrigger>
                        <TabsTrigger value="budtender" className="gap-2">
                            <Bot className="h-4 w-4" />
                            Budtender
                        </TabsTrigger>
                        <TabsTrigger value="themes" className="gap-2">
                            <Zap className="h-4 w-4" />
                            Themes
                        </TabsTrigger>
                    </TabsList>

                    {/* Staff Guide link */}
                    <Link
                        href="/dashboard/menu/staff-guide"
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <BookOpen className="h-3.5 w-3.5" />
                        Staff Guide
                    </Link>
                </div>

                {/* Menu Tab */}
                <TabsContent value="menu" className="mt-4">
                    <MenuPreviewTab
                        previewData={previewData}
                        previewLoading={previewLoading}
                        domainProducts={domainProducts}
                        loading={loading}
                        onProductReorder={handleProductReorder}
                        onToggleFeatured={handleToggleFeatured}
                        onFullScreen={() => setFullScreen(true)}
                        orgId={orgId || ''}
                        isPublished={getStatus('menu')?.isPublished ?? false}
                        updatedAt={getStatus('menu')?.updatedAt ?? null}
                        onPublishToggle={handlePublishToggle}
                    />
                </TabsContent>

                {/* Locations Tab */}
                <TabsContent value="locations" className="mt-4">
                    <LocationsTab
                        orgId={orgId || ''}
                        brandSlug={previewData?.brandSlug ?? null}
                        locations={locations}
                        isPublished={getStatus('locations')?.isPublished ?? false}
                        updatedAt={getStatus('locations')?.updatedAt ?? null}
                        onPublishToggle={handlePublishToggle}
                    />
                </TabsContent>

                {/* Zip Code SEO Tab */}
                <TabsContent value="zip-seo" className="mt-4">
                    <ZipSeoTab
                        orgId={orgId || ''}
                        zipSeoContent={zipSeoContent}
                        isPublished={getStatus('zip_seo')?.isPublished ?? false}
                        updatedAt={getStatus('zip_seo')?.updatedAt ?? null}
                        onPublishToggle={handlePublishToggle}
                    />
                </TabsContent>

                {/* Budtender Tab */}
                <TabsContent value="budtender" className="mt-4">
                    <BudtenderTab
                        domainProducts={domainProducts}
                        brandId={previewData?.brand?.id}
                        chatbotConfig={previewData?.brand?.chatbotConfig}
                    />
                </TabsContent>

                {/* Themes Tab */}
                <TabsContent value="themes" className="mt-4">
                    <ThemeManager orgId={orgId || ''} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
