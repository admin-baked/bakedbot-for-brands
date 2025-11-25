
// src/app/page.tsx
import { HomeLanding } from '@/components/home-landing';
import { HeroSlider } from '@/components/hero-slider';
import { ProductCarousel } from '@/components/product-carousel';
import { DispensaryLocatorSection } from '@/components/dispensary-locator-section';
import RecentReviewsFeed from '@/components/recent-reviews-feed';
import { demoProducts, demoCustomer } from '@/lib/demo/demo-data';

// This page is now a Server Component and can fetch data directly.
// For the demo, we'll continue using the static demo data.

export default function HomePage() {
  const products = demoProducts;
  const reviews = demoCustomer.reviews;

  return (
    <>
      <HomeLanding />
      <div className="container mx-auto px-4 py-8 space-y-12">
        <HeroSlider products={products.slice(0, 3)} isLoading={false} />
        <ProductCarousel title="Featured Products" products={products} isLoading={false} />
        <DispensaryLocatorSection />
        <RecentReviewsFeed reviews={reviews as any[]} products={products} isLoading={false} />
      </div>
    </>
  );
}
