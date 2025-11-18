
'use client';

// This is a temporary compatibility shim.
// It re-exports the necessary context hook from the new layout client.
// This allows older components to import from their original path without breaking
// during the transition. Once all components are migrated to the new data flow,
// this file can and should be deleted.

import { useMenuData } from '@/app/menu/menu-layout-client';
import TiledMenuPage from './menu/tiled/page';
import { useHydrated } from '@/hooks/use-hydrated';
import { useCookieStore } from '@/lib/cookie-storage';
import { HeroSlider } from '@/components/hero-slider';
import DispensaryLocator from '@/components/dispensary-locator';
import { ProductGrid } from '@/components/product-grid';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import { FloatingCartPill } from '@/components/floating-cart-pill';
import Chatbot from '@/components/chatbot';

export { useMenuData };

export default function MenuPageClient() {
    const hydrated = useHydrated();
    const { products, locations, reviews, featuredProducts, brandId, isDemo } = useMenuData();
    const { menuStyle } = useCookieStore();

    if (hydrated && menuStyle === 'alt') {
        return <TiledMenuPage />;
    }

    return (
        <>
            <div className="container mx-auto px-4 space-y-12 py-8">
                <HeroSlider products={featuredProducts} isLoading={!hydrated} />
                <DispensaryLocator locations={locations} isLoading={!hydrated}/>
                <ProductGrid products={products} isLoading={!hydrated} />
                <RecentReviewsFeed reviews={reviews} products={products} isLoading={!hydrated} />
            </div>
            <FloatingCartPill />
            <Chatbot products={featuredProducts} brandId={brandId} />
        </>
    )
}
