// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { useRouter } from 'next/navigation';
import { BrandProductSearch } from '../components/brand-product-search';

export default function ImportProductsPage() {
    const router = useRouter();

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Link Brand Products</h1>
                <p className="text-neutral-500 mt-2 text-lg">
                    Connect your brand to the BakedBot catalog. Search for your brand to find products already populated in our network.
                </p>
            </div>

            <BrandProductSearch 
                onSuccess={() => router.push('/dashboard/products')}
            />
        </div>
    );
}
