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

export default async function BrandLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ brand: string }>;
}) {
    // await params if we needed to access it here, but we aren't using it yet.
    // just ensures strict type compliance.
    // const { brand } = await params;
    // logic to validate brand exists
    // const brand = await fetchBrand(params.brand);
    // if (!brand) notFound();

    return (
        <div className="min-h-screen bg-background text-foreground">
            <WebAgeGate />
            {/* 
         We could wrap this in a BrandContext provider if we had one.
         For now, just render children.
      */}
            {children}
        </div>
    );
}
