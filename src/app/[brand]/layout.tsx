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
    // Note: Header is rendered by BrandMenuClient to support both
    // dispensary and brand menu modes with appropriate styling
    return (
        <div className="min-h-screen bg-background text-foreground">
            <WebAgeGate />
            {children}
        </div>
    );
}
