/**
 * Embedded Menu Page
 *
 * Renders a full menu experience inside an iframe for embedding on external sites.
 * Supports both brand and dispensary menus based on the entity's menuDesign setting.
 *
 * URL: /embed/menu/{brandId}
 * Query Params:
 *   - layout: 'grid' | 'list' | 'compact' (default: 'grid')
 *   - showCart: 'true' | 'false' (default: 'true')
 *   - showCategories: 'true' | 'false' (default: 'true')
 *   - primaryColor: hex color (e.g., '#10b981')
 *
 * Note: This page provides NO SEO benefit when embedded as an iframe.
 * For SEO, brands should use custom domain or the main bakedbot.ai/{brand} URL.
 */

import { notFound } from 'next/navigation';
import { fetchBrandPageData } from '@/lib/brand-data';
import { EmbedMenuClient } from './embed-menu-client';

interface EmbedMenuPageProps {
    params: Promise<{ brandId: string }>;
    searchParams: Promise<{
        layout?: 'grid' | 'list' | 'compact';
        showCart?: string;
        showCategories?: string;
        primaryColor?: string;
    }>;
}

export default async function EmbedMenuPage({ params, searchParams }: EmbedMenuPageProps) {
    const { brandId } = await params;
    const search = await searchParams;

    // Fetch brand and products
    const { brand, products, retailers } = await fetchBrandPageData(brandId);

    if (!brand) {
        notFound();
    }

    // Parse query params with defaults
    const config = {
        layout: search.layout || 'grid',
        showCart: search.showCart !== 'false',
        showCategories: search.showCategories !== 'false',
        primaryColor: search.primaryColor
            ? `#${search.primaryColor.replace('#', '')}`
            : brand.theme?.primaryColor || '#16a34a',
    };

    return (
        <EmbedMenuClient
            brand={brand}
            products={products}
            retailers={retailers || []}
            config={config}
        />
    );
}
