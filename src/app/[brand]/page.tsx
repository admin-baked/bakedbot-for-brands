import { createServerClient } from '@/firebase/server-client';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Actions & Data
import { fetchBrandPageData } from '@/lib/brand-data';
import { getActiveBundles } from '@/app/actions/bundles';
import { getHeroSlides } from '@/app/actions/hero-slides';
import { getPublicMenuSettings } from '@/server/actions/loyalty-settings';
import { demoProducts } from '@/lib/demo/demo-data';
import { buildOpeningHoursSpecification } from '@/lib/agent-web/schema-org-builder';

// Components
import { MenuWithAgeGate } from '@/components/menu/menu-with-age-gate';
import { BrandMenuClient } from './brand-menu-client';
import { DispensaryHeader } from '@/components/dispensary/dispensary-header';
import { ProductGrid } from '@/components/product-grid';
import DispensaryLocator from '@/components/dispensary-locator';
import Chatbot from '@/components/chatbot';

// Disable caching to ensure fresh data on each request
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ brand: string }> }): Promise<Metadata> {
    const { brand: brandParam } = await params;
    const isDemo = ['demo', 'demo-shop', 'demo-brand', 'demo-40tons'].includes(brandParam);
    if (isDemo) return { robots: { index: false, follow: true } };

    try {
        const { brand } = await fetchBrandPageData(brandParam);
        if (!brand) return { robots: { index: false, follow: true } };

        const brandName = brand.name;
        const city    = brand.location?.city  ?? (brand as any).city  ?? '';
        const state   = brand.location?.state ?? (brand as any).state ?? '';
        const isDispensary = (brand as any).type === 'dispensary';
        const logoUrl = brand.logoUrl ?? '';
        const canonicalUrl = `https://bakedbot.ai/${brandParam}`;

        // Build a rich, keyword-loaded description
        const locationSuffix = city && state ? ` in ${city}, ${state}` : '';
        const descriptionBase = brand.description && !brand.description.includes('Mock Data')
            ? brand.description
            : isDispensary
                ? `Shop premium cannabis products at ${brandName}${locationSuffix}. Browse today's menu, earn VIP loyalty rewards, and find exclusive deals on flower, edibles, concentrates, and more.`
                : `Shop ${brandName} premium cannabis products online. Browse our full menu of edibles, flower, and concentrates. Fast shipping nationwide.`;

        const keywords = isDispensary
            ? [
                brandName,
                `${brandName} menu`,
                `${brandName} dispensary`,
                city ? `dispensary ${city}` : '',
                city && state ? `cannabis ${city} ${state}` : '',
                state ? `dispensary near me ${state}` : '',
                'cannabis dispensary',
                'weed dispensary',
                'marijuana dispensary',
                'cannabis deals',
                'dispensary loyalty rewards',
                'cannabis menu',
              ].filter(Boolean)
            : [
                brandName,
                `${brandName} edibles`,
                `buy ${brandName} online`,
                'cannabis edibles online',
                'hemp edibles',
                'cannabis gummies',
                'delta-8 edibles',
                'CBD edibles',
                'ship cannabis nationwide',
              ].filter(Boolean);

        return {
            title: isDispensary
                ? `${brandName} Menu & Deals${locationSuffix} | Cannabis Dispensary`
                : `${brandName} | Shop Cannabis Edibles Online`,
            description: descriptionBase,
            keywords: keywords.join(', '),
            alternates: { canonical: canonicalUrl },
            openGraph: {
                title: isDispensary
                    ? `${brandName}${locationSuffix} — Shop Cannabis Today`
                    : `${brandName} — Premium Cannabis Edibles`,
                description: descriptionBase,
                url: canonicalUrl,
                siteName: brandName,
                type: 'website',
                images: logoUrl ? [{ url: logoUrl, alt: brandName }] : [],
            },
            twitter: {
                card: 'summary',
                title: brandName,
                description: descriptionBase,
                images: logoUrl ? [logoUrl] : [],
            },
        };
    } catch {
        return {};
    }
}

export default async function BrandPage({ params }: { params: Promise<{ brand: string }> }) {
    const { brand: brandParam } = await params;

    // Reserved paths that should not be treated as brand slugs
    const RESERVED_PATHS = [
        'help',
        'dashboard',
        'api',
        'login',
        'signup',
        'auth',
        'vibe',
        'academy',
        '_next',
        'favicon.ico',
        'onboarding',
    ];

    // If this is a reserved path, let Next.js handle it with the proper route
    if (RESERVED_PATHS.includes(brandParam)) {
        notFound();
    }

    // Fetch real data
    const { brand, products, retailers, featuredBrands = [], carousels = [] } = await fetchBrandPageData(brandParam);

    // Enforce canonical slug — if the brand has a slug and the URL doesn't match it, 404.
    // This prevents /brand_ecstatic_edibles from serving when /ecstaticedibles is canonical.
    if (brand?.slug && brand.slug !== brandParam) {
        notFound();
    }

    // If brand not found, show helpful page or demo
    if (!brand) {
        // Fallback for "demo" slug to show the placeholder experience
        if (brandParam === 'demo' || brandParam === 'demo-brand') {
            return (
                <main className="relative min-h-screen">
                    <DispensaryHeader brandName="Demo Dispensary" />
                    {/* <CategoryNav />
                    <DealsCarousel /> */}
                    <div className="container mx-auto py-8">
                        <ProductGrid products={demoProducts} isLoading={false} />
                    </div>
                    {/* Demo locator if we had demo retailers, or empty */}
                    <DispensaryLocator locations={[]} isLoading={false} />
                    <Chatbot products={demoProducts} brandId="demo" initialOpen={true} />
                </main>
            );
        }
        // Show a friendly "brand not found" page instead of hard 404
        // This helps users who haven't completed setup yet
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="text-6xl mb-4">🌿</div>
                    <h1 className="text-2xl font-bold mb-2">Brand Not Found</h1>
                    <p className="text-gray-600 mb-6">
                        The brand page &quot;{brandParam}&quot; hasn&apos;t been set up yet.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        If you own this brand, please complete your setup in the dashboard.
                    </p>
                    <a
                        href="/dashboard/brand-page"
                        className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        Set Up Your Brand Page
                    </a>
                </div>
            </main>
        );
    }

    // Fetch active bundles for this brand/org
    let bundles: import('@/types/bundles').BundleDeal[] = [];
    try {
        bundles = await getActiveBundles(brand.id);
    } catch (e) {
        console.error('Failed to fetch bundles:', e);
    }

    // Fetch active hero slides for this brand/org
    let heroSlides: import('@/types/hero-slides').HeroSlide[] = [];
    try {
        heroSlides = await getHeroSlides(brand.id);
    } catch (e) {
        console.error('Failed to fetch hero slides:', e);
    }

    // Fetch public loyalty/menu display settings (no auth required)
    const publicMenuSettings = await getPublicMenuSettings(brand.id).catch(() => null);

    // JSON-LD structured data for search engines
    const isDispensary = (brand as any).type === 'dispensary';
    const city    = brand.location?.city  ?? (brand as any).city  ?? '';
    const state   = brand.location?.state ?? (brand as any).state ?? '';
    const phone   = brand.location?.phone ?? (brand as any).phone ?? '';
    const address = brand.location?.address ?? (brand as any).address ?? '';
    const zip     = brand.location?.zip   ?? (brand as any).zip   ?? '';
    const canonicalUrl = `https://bakedbot.ai/${brandParam}`;
    const storeId = `${canonicalUrl}#store`;
    const orgId   = `${canonicalUrl}#org`;
    const hoursSpec = buildOpeningHoursSpecification(brand);
    const websiteUrl: string | undefined = (brand as any).website ?? undefined;
    const brandDescription: string = (brand as any).description ?? (
        isDispensary
            ? `Cannabis dispensary in ${city}, ${state}`
            : 'Premium cannabis brand'
    );

    // 1. Main entity — MedicalBusiness (dispensary) or Organization (brand)
    const mainEntitySchema = isDispensary ? {
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        '@id': storeId,
        name: brand.name,
        description: brandDescription,
        url: canonicalUrl,
        ...(brand.logoUrl ? { logo: brand.logoUrl } : {}),
        ...(phone ? { telephone: phone } : {}),
        ...(address ? {
            address: {
                '@type': 'PostalAddress',
                streetAddress: address,
                addressLocality: city,
                addressRegion: state,
                postalCode: zip,
                addressCountry: 'US',
            },
        } : {}),
        ...(hoursSpec.length > 0 ? { openingHoursSpecification: hoursSpec } : {}),
        priceRange: '$$',
        currenciesAccepted: 'USD',
        paymentAccepted: 'Cash, Credit Card, Debit Card',
        ...(address ? { hasMap: `https://maps.google.com/?q=${encodeURIComponent([address, city, state].filter(Boolean).join(', '))}` } : {}),
        sameAs: [websiteUrl].filter(Boolean),
    } : {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': orgId,
        name: brand.name,
        description: brandDescription,
        url: canonicalUrl,
        ...(brand.logoUrl ? { logo: brand.logoUrl } : {}),
        sameAs: [websiteUrl].filter(Boolean),
    };

    // 2. ProfilePage — canonical identity page signal
    const profilePageSchema = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        name: `${brand.name} ${isDispensary ? 'Cannabis Dispensary' : 'Cannabis Brand'}`,
        url: canonicalUrl,
        mainEntity: { '@id': isDispensary ? storeId : orgId },
    };

    // 3. BreadcrumbList
    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bakedbot.ai' },
            isDispensary
                ? { '@type': 'ListItem', position: 2, name: 'Dispensaries', item: 'https://bakedbot.ai/dispensaries' }
                : { '@type': 'ListItem', position: 2, name: 'Brands', item: 'https://bakedbot.ai/brands' },
            { '@type': 'ListItem', position: 3, name: brand.name, item: canonicalUrl },
        ],
    };

    // 4. Product ItemList — top 12 products for SERP visibility
    const topProducts = ((products ?? []) as Array<{ name?: string | null; id?: string | null }>).slice(0, 12);
    const productListSchema = topProducts.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${brand.name} Cannabis Menu`,
        numberOfItems: (products ?? []).length,
        itemListElement: topProducts.map((p: { name?: string | null; id?: string | null }, i: number) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: (p as any).name ?? 'Product',
            url: `${canonicalUrl}/products/${(p as any).id}`,
            ...((p as any).imageUrl ? { image: (p as any).imageUrl } : {}),
        })),
    } : null;

    // 5. FAQPage — dispensaries only, factual answers only (no health/medical claims)
    const faqItems: Record<string, unknown>[] = [];
    if (isDispensary) {
        if (address && city) {
            faqItems.push({
                '@type': 'Question',
                name: `Where is ${brand.name} located?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `${brand.name} is located at ${[address, city, state, zip].filter(Boolean).join(', ')}.`,
                },
            });
        }
        if (phone) {
            faqItems.push({
                '@type': 'Question',
                name: `What is the phone number for ${brand.name}?`,
                acceptedAnswer: { '@type': 'Answer', text: `You can reach ${brand.name} at ${phone}.` },
            });
        }
        faqItems.push({
            '@type': 'Question',
            name: `What products does ${brand.name} carry?`,
            acceptedAnswer: {
                '@type': 'Answer',
                text: `${brand.name} carries cannabis products including flower, edibles, concentrates, pre-rolls, and accessories. Browse the full menu at ${canonicalUrl}.`,
            },
        });
        faqItems.push({
            '@type': 'Question',
            name: `Does ${brand.name} have a loyalty program?`,
            acceptedAnswer: {
                '@type': 'Answer',
                text: `${brand.name} offers a VIP loyalty rewards program. Earn points on every purchase and redeem for discounts on future orders.`,
            },
        });
    }
    const faqSchema = faqItems.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems,
    } : null;

    const allSchemas = [
        mainEntitySchema,
        profilePageSchema,
        breadcrumbSchema,
        ...(productListSchema ? [productListSchema] : []),
        ...(faqSchema ? [faqSchema] : []),
    ];

    return (
        <MenuWithAgeGate
            brandId={brand.id}
            source={`brand-menu-${brandParam}`}
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(allSchemas) }}
            />
            {/* Link to machine-readable agent API for AI crawlers */}
            <link rel="alternate" type="application/ld+json" href={`/api/agent/${brandParam}`} />
            <main className="relative min-h-screen">
                <BrandMenuClient
                    brand={brand}
                    products={products}
                    retailers={retailers}
                    brandSlug={brandParam}
                    bundles={bundles}
                    heroSlides={heroSlides}
                    featuredBrands={featuredBrands}
                    carousels={carousels}
                    publicMenuSettings={publicMenuSettings}
                />
            </main>
        </MenuWithAgeGate>
    );
}
