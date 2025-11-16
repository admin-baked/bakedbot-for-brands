

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import ProductDetailsClient from './components/product-details-client';
import Chatbot from '@/components/chatbot';
import { getReviewSummary } from './actions';
import { createServerClient } from '@/firebase/server-client';
import { demoProducts } from '@/lib/data';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Header from '@/app/components/header';
import { Footer } from '@/app/components/footer';
import { cookies } from 'next/headers';
import { makeProductRepo } from '@/server/repos/productRepo';
import type { Product } from '@/types/domain';

type Props = {
  params: { id: string, brandId: string }
}

const getProduct = async (id: string, brandId?: string): Promise<Product | null> => {
    const cookieStore = cookies();
    const isDemo = cookieStore.get('isUsingDemoData')?.value === 'true';

    if (isDemo || brandId === 'default') {
      return demoProducts.find(p => p.id === id) || null;
    }

    try {
        const { firestore } = await createServerClient();
        const productRepo = makeProductRepo(firestore);
        const product = await productRepo.getById(id);

        // SECURITY: Ensure the fetched product belongs to the requested brand.
        if (product && product.brandId === brandId) {
            return product;
        }
        
        // If product doesn't exist or doesn't belong to the brand, return null.
        return null;
    } catch (error) {
        console.error("Error fetching product on server:", error);
        return null;
    }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  // The brandId is now available from the URL params.
  const product = await getProduct(id, params.brandId);

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: `${product.name} | AI Agent Budtender`,
    description: product.description,
  }
}

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
    // The brandId from the URL is now used for fetching.
    const product = await getProduct(params.id, params.brandId);

    if (!product) {
        notFound();
    }
    
    // Fetch the review summary using the new server action
    const summary = await getReviewSummary({ productId: product.id });

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="container mx-auto flex-1">
                <Suspense fallback={<ProductPageSkeleton />}>
                    <ProductDetailsClient product={product} summary={summary} />
                </Suspense>
            </main>
            <FloatingCartPill />
            <Chatbot />
            <Footer />
        </div>
    )
}
