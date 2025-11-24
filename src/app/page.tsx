
import Link from "next/link";
import { HomeLanding } from "@/components/home-landing";
import { HeroSlider } from "@/components/hero-slider";
import { ProductCarousel } from "@/components/product-carousel";
import RecentReviewsFeed from "@/components/recent-reviews-feed";
import { demoProducts, demoCustomer } from "@/lib/demo/demo-data";
import type { Review, Product } from "@/types/domain";

export default function HomePage() {
  return (
    <>
      <main className="container mx-auto px-4 py-8">
        <HeroSlider products={demoProducts.slice(0, 3)} isLoading={false} />
        <HomeLanding />
        <ProductCarousel 
          title="Featured Products"
          products={demoProducts}
          isLoading={false}
        />
        <RecentReviewsFeed 
          reviews={demoCustomer.reviews as Review[]}
          products={demoProducts as Product[]}
          isLoading={false}
        />
      </main>
      <div className="text-center my-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium underline underline-offset-4"
        >
          Go to dashboard
        </Link>
      </div>
    </>
  );
}
