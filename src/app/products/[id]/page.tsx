

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';
import { Skeleton } from '@/components/ui/skeleton';
import ProductDetailsClient from './components/product-details-client';
import Chatbot from '@/components/chatbot';
import Link from 'next/link';
import { Search, User, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getReviewSummary } from './actions';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import { createServerClient } from '@/firebase/server-client';
import { doc, getDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { demoProducts } from '@/lib/data';
import { FloatingCartPill } from '@/app/components/floating-cart-pill';
import Header from '@/app/components/header';

type Props = {
  params: { id: string }
}

// Fetch a single product from Firestore on the server, with a fallback to demo data
const getProduct = async (id: string): Promise<Product | null> => {
    try {
        const { firestore } = await createServerClient();
        const productRef = doc(firestore, 'products', id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
            return { id: productSnap.id, ...productSnap.data() } as Product;
        }
        
        // Fallback to demo data if not found in Firestore
        const demoProduct = demoProducts.find(p => p.id === id);
        return demoProduct || null;

    } catch (error) {
        console.error("Error fetching product on server, falling back to demo data:", error);
        const demoProduct = demoProducts.find(p => p.id === id);
        return demoProduct || null;
    }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const product = await getProduct(id);

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
    const product = await getProduct(params.id);

    if (!product) {
        notFound();
    }
    
    // Fetch the review summary using the new server action
    const summary = await getReviewSummary(product.id, product.name);

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto">
                <Suspense fallback={<ProductPageSkeleton />}>
                    <ProductDetailsClient product={product} summary={summary} />
                </Suspense>
            </main>
            <FloatingCartPill />
            <Chatbot />
        </div>
    )
}

    
