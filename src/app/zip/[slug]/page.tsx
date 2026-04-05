// src/app/zip/[slug]/page.tsx
export const dynamic = 'force-dynamic';
/**
 * Zip Code SEO Page — SSR dispensary discovery landing page.
 * URL: /zip/[ZIP]-dispensary  (e.g. /zip/13210-dispensary)
 *
 * Queries Firestore for brands whose location.zip matches,
 * linking directly to their BakedBot menu pages.
 */

import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createServerClient } from '@/firebase/server-client';
import { createSlug } from '@/lib/utils/slug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Store, ArrowRight, Clock, Star } from 'lucide-react';

interface ZipPageProps {
    params: Promise<{ slug: string }>;
}

interface NearbyBrand {
    id: string;
    name: string;
    slug: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
}

// React cache deduplicates this across generateMetadata + page in one request
const getBrandsForZip = cache(async (zip: string): Promise<NearbyBrand[]> => {
    try {
        const { firestore: db } = await createServerClient();

        const [nested, flat] = await Promise.all([
            db.collection('brands').where('location.zip', '==', zip).limit(10).get(),
            db.collection('brands').where('zip', '==', zip).limit(10).get(),
        ]);

        const seen = new Set<string>();
        const results: NearbyBrand[] = [];

        for (const doc of [...nested.docs, ...flat.docs]) {
            if (seen.has(doc.id)) continue;
            seen.add(doc.id);
            const d = doc.data();
            results.push({
                id: doc.id,
                name: d.name || 'Dispensary',
                slug: d.slug || doc.id,
                address: d.location?.address ?? d.address,
                city: d.location?.city ?? d.city,
                state: d.location?.state ?? d.state,
                zip: d.location?.zip ?? d.zip ?? zip,
            });
        }

        return results;
    } catch {
        return [];
    }
});

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: ZipPageProps): Promise<Metadata> {
    const { slug } = await params;
    const zip = slug.split('-')[0];
    if (!zip || !/^\d{5}$/.test(zip)) return { title: 'Not Found' };

    const brands = await getBrandsForZip(zip);
    const cityName = brands[0]?.city ?? null;
    const stateName = brands[0]?.state ?? null;
    const locationSuffix = cityName ? ` — ${cityName}${stateName ? `, ${stateName}` : ''}` : '';

    return {
        title: `Cannabis Dispensaries Near ${zip}${locationSuffix} | BakedBot`,
        description: `Find licensed cannabis dispensaries serving the ${zip} area. Browse menus, hours, and deals at ${brands.length > 0 ? brands.map(b => b.name).join(', ') : 'local dispensaries'}.`,
        robots: { index: true, follow: true },
        alternates: { canonical: `/zip/${zip}-dispensary` },
    };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ZipSEOPage({ params }: ZipPageProps) {
    const { slug } = await params;
    const zip = slug.split('-')[0];

    if (!zip || !/^\d{5}$/.test(zip)) notFound();

    const brands = await getBrandsForZip(zip);
    const cityName = brands[0]?.city ?? null;
    const stateName = brands[0]?.state ?? null;
    const citySlug = cityName ? `${createSlug(cityName)}-cannabis-dispensaries` : null;

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Cannabis Dispensaries Near ${zip}`,
        description: `Licensed dispensaries serving ${zip}${cityName ? ` in ${cityName}` : ''}.`,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: brands.map((b, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                    '@type': 'LocalBusiness',
                    name: b.name,
                    url: `https://bakedbot.ai/${b.slug}`,
                    address: {
                        '@type': 'PostalAddress',
                        streetAddress: b.address,
                        addressLocality: b.city,
                        addressRegion: b.state,
                        postalCode: b.zip,
                    },
                },
            })),
        },
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />

            <section className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center space-y-4">
                    <Badge variant="outline" className="text-sm">
                        <MapPin className="h-3 w-3 mr-1" />
                        Zip Code {zip}
                    </Badge>
                    <h1 className="text-4xl font-black tracking-tight">
                        Cannabis Dispensaries Near {zip}
                        {cityName && (
                            <span className="block text-2xl font-semibold text-muted-foreground mt-1">
                                {cityName}{stateName ? `, ${stateName}` : ''}
                            </span>
                        )}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        {brands.length > 0
                            ? `${brands.length} dispensar${brands.length === 1 ? 'y' : 'ies'} serving the ${zip} area. Browse live menus and deals powered by BakedBot AI.`
                            : `Discover licensed cannabis dispensaries near ${zip}. Browse menus and find deals powered by BakedBot AI.`}
                    </p>
                </div>
            </section>

            <section className="container mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6">
                    {brands.length > 0 ? 'Dispensaries on BakedBot' : 'No Partner Dispensaries Yet'}
                </h2>

                {brands.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {brands.map((brand) => (
                            <Card key={brand.id} className="hover:shadow-lg transition-shadow group">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Store className="h-5 w-5 text-primary shrink-0" />
                                        {brand.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {brand.address && (
                                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                                            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                            {brand.address}{brand.city ? `, ${brand.city}` : ''}{brand.state ? ` ${brand.state}` : ''} {brand.zip}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">Licensed</Badge>
                                        <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                                            <Star className="h-3 w-3 mr-1 fill-current" />
                                            Live Menu
                                        </Badge>
                                    </div>
                                    <Button asChild className="w-full mt-2">
                                        <Link href={`/${brand.slug}`}>
                                            View Menu
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">
                                No partner dispensaries in the {zip} area yet.
                            </p>
                            <Button asChild variant="outline">
                                <Link href="/join">Are you a dispensary? Join BakedBot</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </section>

            {citySlug && cityName && (
                <section className="container mx-auto px-4 py-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardContent className="p-6 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Explore all of {cityName}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    View the full {cityName} cannabis guide — dispensaries, hours, and deals.
                                </p>
                            </div>
                            <Button asChild variant="outline" className="shrink-0">
                                <Link href={`/cities/${citySlug}`}>
                                    View City Guide
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </section>
            )}
        </div>
    );
}

// Dynamic rendering — no ISR needed (force-dynamic above handles caching behavior)
