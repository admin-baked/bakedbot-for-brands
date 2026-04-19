export const revalidate = 3600; // hourly ISR — pages don't change often, needs Google indexing

import { fetchBrandPageData } from '@/lib/brand-data';
import { getBrandPageBySlug } from '@/server/actions/brand-pages';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Clock, Phone, ArrowRight, ExternalLink, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DemoHeader } from '@/components/demo/demo-header';
import { DemoFooter } from '@/components/demo/demo-footer';
import { logger } from '@/lib/logger';

export async function generateMetadata(
    { params }: { params: Promise<{ brand: string; zip: string }> }
): Promise<Metadata> {
    const { brand: brandSlug, zip } = await params;
    try {
        const { brand } = await fetchBrandPageData(brandSlug);
        if (!brand) return {};
        const city = brand.location?.city ?? (brand as any).city ?? '';
        const state = brand.location?.state ?? (brand as any).state ?? '';
        const title = `${brand.name} — Dispensary Near ${zip}${city ? ` | ${city}, ${state}` : ''}`;
        const description = `Looking for a dispensary near ${zip}? ${brand.name} is${city ? ` located in ${city}, ${state}` : ' nearby'}. Browse our live menu, hours, and directions.`;
        return {
            title,
            description,
            alternates: { canonical: `https://bakedbot.ai/${brandSlug}/near/${zip}` },
            openGraph: { title, description, url: `https://bakedbot.ai/${brandSlug}/near/${zip}` },
        };
    } catch (err) {
        logger.error('[generateMetadata near/zip]', { error: String(err) });
        return {};
    }
}

export default async function DispensaryNearZipPage(
    { params }: { params: Promise<{ brand: string; zip: string }> }
) {
    const { brand: brandSlug, zip } = await params;

    const [{ brand }, pageContent] = await Promise.all([
        fetchBrandPageData(brandSlug),
        getBrandPageBySlug(brandSlug, 'locations'),
    ]);
    const locData = pageContent?.locationsContent;
    const primaryLoc = locData?.locations?.[0] ?? null;

    const city    = brand.location?.city  ?? (brand as any).city  ?? '';
    const state   = brand.location?.state ?? (brand as any).state ?? '';
    const address = brand.location?.address ?? (brand as any).address ?? '';
    const phone   = brand.location?.phone  ?? (brand as any).phone  ?? '';
    const hours   = primaryLoc?.hours ?? null;
    const mapUrl  = primaryLoc?.mapUrl ?? (address ? `https://maps.google.com/?q=${encodeURIComponent([address, city, state].filter(Boolean).join(', '))}` : null);
    const features = primaryLoc?.features ?? [];

    const brandColors = {
        primary: (brand as any).primaryColor || '#16a34a',
        secondary: (brand as any).secondaryColor || '#15803d',
    };

    // Schema.org: LocalBusiness + FAQPage + BreadcrumbList
    const localBusinessSchema = {
        '@context': 'https://schema.org',
        '@type': 'MedicalBusiness',
        name: brand.name,
        url: `https://bakedbot.ai/${brandSlug}`,
        description: `Cannabis dispensary near ${zip}${city ? ` serving ${city}, ${state} and surrounding zip codes` : ''}`,
        ...(brand.logoUrl ? { logo: brand.logoUrl } : {}),
        ...(phone ? { telephone: phone } : {}),
        ...(address ? {
            address: {
                '@type': 'PostalAddress',
                streetAddress: address,
                addressLocality: city,
                addressRegion: state,
                postalCode: brand.location?.zip ?? (brand as any).zip ?? '',
                addressCountry: 'US',
            },
        } : {}),
        ...(mapUrl ? { hasMap: mapUrl } : {}),
        priceRange: '$$',
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `Is there a dispensary near ${zip}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `Yes — ${brand.name} is${address ? ` located at ${address}, ${city}, ${state}` : ` a cannabis dispensary${city ? ` in ${city}, ${state}` : ''}`} serving customers near ${zip}. Browse the live menu at bakedbot.ai/${brandSlug}.`,
                },
            },
            {
                '@type': 'Question',
                name: `What are the hours for ${brand.name}?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: hours ?? `Visit bakedbot.ai/${brandSlug}/locations for current hours.`,
                },
            },
            ...(phone ? [{
                '@type': 'Question',
                name: `What is the phone number for ${brand.name}?`,
                acceptedAnswer: { '@type': 'Answer', text: `Call ${brand.name} at ${phone}.` },
            }] : []),
        ],
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bakedbot.ai' },
            { '@type': 'ListItem', position: 2, name: brand.name, item: `https://bakedbot.ai/${brandSlug}` },
            { '@type': 'ListItem', position: 3, name: `Near ${zip}`, item: `https://bakedbot.ai/${brandSlug}/near/${zip}` },
        ],
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify([localBusinessSchema, faqSchema, breadcrumbSchema]) }}
            />

            <DemoHeader
                brandName={brand.name}
                brandLogo={brand.logoUrl}
                brandSlug={brandSlug}
                useLogoInHeader={brand.useLogoInHeader}
                brandColors={brandColors}
                location={city && state ? `${city}, ${state}` : undefined}
            />

            {/* Local context banner */}
            <div className="border-b" style={{ backgroundColor: brandColors.primary + '14' }}>
                <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" style={{ color: brandColors.primary }} />
                        Showing results for dispensaries near <strong>{zip}</strong>
                    </p>
                    <Button asChild size="sm" style={{ backgroundColor: brandColors.primary }}>
                        <Link href={`/${brandSlug}`} className="text-white flex items-center gap-1.5">
                            Browse Menu <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>
            </div>

            <main className="flex-1">
                {/* Hero */}
                <section className="py-14 bg-gradient-to-b from-muted/30 to-background">
                    <div className="container mx-auto px-4 max-w-3xl text-center">
                        <p className="text-sm font-medium mb-3" style={{ color: brandColors.primary }}>
                            Dispensary near {zip}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold mb-4">
                            {brand.name}
                        </h1>
                        {city && state && (
                            <p className="text-muted-foreground text-lg">
                                Serving {city}, {state} and surrounding zip codes
                            </p>
                        )}
                    </div>
                </section>

                {/* Info + CTA */}
                <section className="py-10">
                    <div className="container mx-auto px-4 max-w-4xl grid md:grid-cols-2 gap-8">

                        {/* Location info card */}
                        <div className="rounded-2xl border bg-card p-6 space-y-4">
                            <h2 className="font-semibold flex items-center gap-2">
                                <Store className="h-4 w-4" style={{ color: brandColors.primary }} />
                                Store Info
                            </h2>

                            {address && (
                                <div className="flex items-start gap-3 text-sm">
                                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p>{address}</p>
                                        <p>{city}, {state}{brand.location?.zip ? ` ${brand.location.zip}` : ''}</p>
                                        {mapUrl && (
                                            <a
                                                href={mapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs flex items-center gap-1 mt-1 hover:underline"
                                                style={{ color: brandColors.primary }}
                                            >
                                                Get Directions <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {hours && (
                                <div className="flex items-start gap-3 text-sm">
                                    <Clock className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <p className="whitespace-pre-line text-muted-foreground">{hours}</p>
                                </div>
                            )}

                            {phone && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <a href={`tel:${phone}`} className="hover:underline" style={{ color: brandColors.primary }}>
                                        {phone}
                                    </a>
                                </div>
                            )}

                            {features.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    {features.map(f => (
                                        <span key={f} className="text-xs px-2 py-0.5 rounded-full border">{f}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Menu CTA card */}
                        <div className="rounded-2xl p-6 text-white flex flex-col justify-between gap-6" style={{ backgroundColor: brandColors.secondary || brandColors.primary }}>
                            <div>
                                <p className="text-sm opacity-75 mb-2">Live menu — updated daily</p>
                                <h3 className="text-2xl font-bold mb-3">Ready to shop?</h3>
                                <p className="text-sm opacity-80">
                                    Browse flower, edibles, concentrates, pre-rolls, and more.
                                    {brand.name} carries top cannabis brands with loyalty rewards on every purchase.
                                </p>
                            </div>
                            <Button asChild className="bg-white font-semibold hover:bg-white/90" style={{ color: brandColors.secondary || brandColors.primary }}>
                                <Link href={`/${brandSlug}`} className="flex items-center gap-2">
                                    View Full Menu <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* FAQ (visible to humans + Google) */}
                <section className="py-10 border-t">
                    <div className="container mx-auto px-4 max-w-3xl">
                        <h2 className="text-xl font-semibold mb-6">Frequently Asked Questions</h2>
                        <div className="space-y-5">
                            <div>
                                <h3 className="font-medium mb-1">Is there a dispensary near {zip}?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Yes — {brand.name} is{address ? ` located at ${address}, ${city}, ${state}` : ` a licensed cannabis dispensary${city ? ` in ${city}, ${state}` : ''}`} serving customers near {zip} and surrounding areas.
                                </p>
                            </div>
                            {hours && (
                                <div>
                                    <h3 className="font-medium mb-1">What are the hours for {brand.name}?</h3>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line">{hours}</p>
                                </div>
                            )}
                            {phone && (
                                <div>
                                    <h3 className="font-medium mb-1">How do I contact {brand.name}?</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Call us at <a href={`tel:${phone}`} className="underline">{phone}</a> or browse our menu at{' '}
                                        <Link href={`/${brandSlug}`} className="underline">bakedbot.ai/{brandSlug}</Link>.
                                    </p>
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium mb-1">What products does {brand.name} carry?</h3>
                                <p className="text-sm text-muted-foreground">
                                    {brand.name} carries adult-use and medical cannabis products including flower, edibles, concentrates, vapes, pre-rolls, and accessories. Browse the live menu for today&apos;s selection and deals.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <DemoFooter
                brandName={brand.name}
                brandLogo={brand.logoUrl}
                primaryColor={brandColors.primary}
                location={brand.location || undefined}
            />
        </div>
    );
}
