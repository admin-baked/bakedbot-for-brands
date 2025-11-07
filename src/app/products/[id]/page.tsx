import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { products as demoProducts } from '@/lib/data';
import type { Metadata, ResolvingMetadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import ProductDetailsClient from './components/product-details-client';
import CartSidebar from '@/app/menu/components/cart-sidebar';
import Chatbot from '@/components/chatbot';
import Link from 'next/link';
import { Search, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { summarizeReviews } from '@/ai/flows/summarize-reviews';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';

type Props = {
  params: { id: string }
}

// In a real app with Firestore, you would fetch this data from the database.
// For this demo, we'll find the product from our static data file.
const getProduct = (id: string) => {
    return demoProducts.find(p => p.id === id);
}

export async function generateStaticParams() {
  return demoProducts.map((product) => ({
    id: product.id,
  }))
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const product = getProduct(id);

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: `${product.name} | BakedBot AI Assistant`,
    description: product.description,
  }
}

const Header = () => {
    return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/menu" className="text-2xl font-bold font-teko tracking-wider">
          BAKEDBOT
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/brand-login">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          {/* Cart button here will not be interactive without being a client component.
              We'll rely on the one inside ProductDetailsClient for interaction. */}
          <Button variant="ghost" size="icon">
            <ShoppingBag className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};


function ProductPageSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto py-8 px-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-8 w-1/4" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}


export default async function ProductPage({ params }: Props) {
    const product = getProduct(params.id);

    if (!product) {
        notFound();
    }
    
    let summary: SummarizeReviewsOutput | null = null;
    try {
        summary = await summarizeReviews({ productId: product.id, productName: product.name });
    } catch(e) {
        console.error("Failed to fetch review summary during page build:", e);
        // We can continue without a summary if it fails
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main>
                <Suspense fallback={<ProductPageSkeleton />}>
                    <ProductDetailsClient product={product} summary={summary} />
                </Suspense>
            </main>
            <CartSidebar />
            <Chatbot />
        </div>
    )
}
