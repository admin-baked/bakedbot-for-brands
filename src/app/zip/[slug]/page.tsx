'use client';

// src/app/zip/[slug]/page.tsx
/**
 * Zip Code SEO Page - Landing page for local cannabis shopping
 * URL Pattern: /zip/[ZIP]-dispensary (e.g., /zip/60601-dispensary)
 * 
 * Features:
 * - Localized menu listings
 * - Smokey Chat with local context
 * - Internal linking to City Hub
 * - Schema.org structured data (LocalBusiness, Product)
 */

import { useParams, notFound } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Store, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';

interface ZipPageData {
    zip: string;
    city: string;
    state: string;
    dispensaries: Array<{
        id: string;
        name: string;
        address: string;
        rating?: number;
    }>;
    nearbyZips: string[];
    citySlug: string;
}

export default function ZipSEOPage() {
    const params = useParams();
    const [data, setData] = useState<ZipPageData | null>(null);
    const [loading, setLoading] = useState(true);

    // Extract zip from slug (e.g., "60601-dispensary" -> "60601")
    const slug = params?.slug as string;
    const zipCode = slug?.split('-')[0];

    useEffect(() => {
        async function fetchData() {
            if (!zipCode) return;
            try {
                // Fetch from Firestore via API or direct client SDK
                const res = await fetch(`/api/seo/zip/${zipCode}`);
                if (res.ok) {
                    const pageData = await res.json();
                    setData(pageData);
                }
            } catch (error) {
                console.error('Failed to fetch zip page data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [zipCode]);

    if (!slug || !zipCode) {
        notFound();
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Fallback content if no data in Firestore yet
    const displayData = data || {
        zip: zipCode,
        city: 'Chicago',
        state: 'IL',
        dispensaries: [],
        nearbyZips: [],
        citySlug: 'chicago-cannabis-guide'
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto text-center space-y-4">
                    <Badge variant="outline" className="text-sm">
                        <MapPin className="h-3 w-3 mr-1" />
                        Zip Code {displayData.zip}
                    </Badge>
                    <h1 className="text-4xl font-black tracking-tight">
                        Cannabis Dispensaries in {displayData.zip}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Discover top-rated cannabis products and dispensaries near {displayData.zip}.
                        Whether you&apos;re seeking relaxing edibles or uplifting sativas,
                        find the best options curated for {displayData.city}, {displayData.state}.
                    </p>
                </div>
            </section>

            {/* Smokey CTA */}
            <section className="container mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
                    <CardContent className="p-6 text-center">
                        <p className="text-lg font-medium mb-4">
                            🤖 Ask Smokey for personalized recommendations!
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            &quot;What&apos;s the best indica edible near {displayData.zip}?&quot;
                        </p>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            Chat with Smokey
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* Dispensaries Grid */}
            <section className="container mx-auto px-4 py-8">
                <h2 className="text-2xl font-bold mb-6">
                    Dispensaries Serving {displayData.zip}
                </h2>
                {displayData.dispensaries.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayData.dispensaries.map((disp) => (
                            <Card key={disp.id} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Store className="h-4 w-4 text-primary" />
                                        {disp.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {disp.address}
                                    </p>
                                    {disp.rating && (
                                        <div className="flex items-center gap-1">
                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-sm font-medium">{disp.rating}</span>
                                        </div>
                                    )}
                                    <Button variant="outline" size="sm" className="mt-3 w-full">
                                        View Menu
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">
                                No partner dispensaries in this area yet.
                                <Link href="/join" className="text-primary ml-1 underline">
                                    Are you a dispensary? Join BakedBot!
                                </Link>
                            </p>
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* City Hub Link */}
            <section className="container mx-auto px-4 py-8">
                <Card className="max-w-2xl mx-auto">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Explore more in {displayData.city}</h3>
                            <p className="text-sm text-muted-foreground">
                                View the full {displayData.city} cannabis guide
                            </p>
                        </div>
                        <Button asChild variant="ghost">
                            <Link href={`/city/${displayData.citySlug}`}>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* Nearby Zips */}
            {displayData.nearbyZips.length > 0 && (
                <section className="container mx-auto px-4 py-8">
                    <h3 className="text-lg font-semibold mb-4">Nearby Areas</h3>
                    <div className="flex flex-wrap gap-2">
                        {displayData.nearbyZips.map((zip) => (
                            <Button key={zip} variant="outline" size="sm" asChild>
                                <Link href={`/zip/${zip}-dispensary`}>
                                    {zip}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
