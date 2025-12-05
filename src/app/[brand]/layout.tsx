import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { brand: string } }): Promise<Metadata> {
    const brandName = params.brand; // In real app, fetch from DB using params.brand (which is slug or domain)

    return {
        title: `${brandName} | Powered by BakedBot`,
        description: `Shop at ${brandName}`,
    };
}

export default function BrandLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { brand: string };
}) {
    // logic to validate brand exists
    // const brand = await fetchBrand(params.brand);
    // if (!brand) notFound();

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* 
         We could wrap this in a BrandContext provider if we had one.
         For now, just render children.
      */}
            {children}
        </div>
    );
}
