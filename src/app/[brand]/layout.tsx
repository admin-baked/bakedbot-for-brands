import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
    const { brand } = await params;
    // Page-level generateMetadata provides the authoritative title/description/OG tags.
    // Layout only owns the llm.txt alternate link — page metadata takes full precedence.
    return {
        alternates: {
            types: {
                'text/plain': `https://bakedbot.ai/${brand}/llm.txt`,
            },
        },
    };
}

export default async function BrandLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ brand: string }>;
}) {
    const { brand } = await params;

    // Note: Header is rendered by BrandMenuClient to support both
    // dispensary and brand menu modes with appropriate styling
    // Note: Age verification is handled by MenuWithAgeGate in page.tsx
    return (
        <div className="min-h-screen bg-background text-foreground">
            <link rel="ai-content" href={`/${brand}/llm.txt`} />
            <link rel="manifest" href={`/api/brand-manifest/${brand}`} />
            {children}
        </div>
    );
}
