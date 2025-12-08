import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
    const { brand } = await params;

    return {
        title: `${brand} | Powered by BakedBot`,
        description: `Shop at ${brand}`,
    };
}

import { WebAgeGate } from '@/components/verification/web-age-gate';

import { fetchBrandPageData } from '@/lib/brand-data';
import { DispensaryHeader } from '@/components/dispensary/dispensary-header';

export default async function BrandLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ brand: string }>;
}) {
    const { brand: brandSlug } = await params;

    // Fetch brand data for the header
    const { brand } = await fetchBrandPageData(brandSlug);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <WebAgeGate />
            {brand && (
                <DispensaryHeader
                    brandName={brand.name}
                    logoUrl={brand.logoUrl}
                />
            )}
            {children}
        </div>
    );
}
