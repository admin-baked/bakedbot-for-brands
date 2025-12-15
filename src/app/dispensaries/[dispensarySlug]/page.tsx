
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StickyOperatorBox } from '@/components/brand/sticky-operator-box';
import { MapPin, Clock, ExternalLink, Globe } from 'lucide-react';
import Link from 'next/link';
import { createServerClient } from '@/firebase/server-client';
import { Retailer } from '@/types/domain';

// Inline data fetcher for now, eventually move to lib/dispensary-data.ts
async function fetchDispensaryData(slug: string) {
    const { firestore } = await createServerClient();

    // Try to find by slug first
    let query = firestore.collection('retailers').where('slug', '==', slug).limit(1);
    let snapshot = await query.get();

    // Fallback: search by id if slug not found (handling id-based slugs for now if used)
    if (snapshot.empty) {
        const doc = await firestore.collection('retailers').doc(slug).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() } as Retailer;
        }
    } else {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Retailer;
    }

    return null;
}

export default async function DispensaryPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
    const { dispensarySlug } = await params;
    const dispensary = await fetchDispensaryData(dispensarySlug);

    if (!dispensary) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Simple Header */}
            <div className="bg-white border-b py-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{dispensary.name}</h1>
                            <div className="flex items-center text-muted-foreground mt-2">
                                <MapPin className="w-4 h-4 mr-1" />
                                {dispensary.address}, {dispensary.city}, {dispensary.state} {dispensary.zip}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {/* Future: Order Online Buttons */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Clock className="w-5 h-5 text-muted-foreground" />
                                        Hours
                                    </div>
                                    <div className="text-sm space-y-1">
                                        {/* Placeholder hours logic */}
                                        <div className="flex justify-between">
                                            <span>Today:</span>
                                            <span>9:00 AM - 9:00 PM</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Globe className="w-5 h-5 text-muted-foreground" />
                                        Online Ordering
                                    </div>
                                    <div className="space-y-2">
                                        {/* If we had links */}
                                        <Button variant="outline" className="w-full justify-between" asChild>
                                            <a href="#" target="_blank">
                                                Visit Website <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Brands Carried (Placeholder) */}
                        <section>
                            <h2 className="text-xl font-bold mb-4">Brands Carried</h2>
                            <p className="text-muted-foreground text-sm">
                                This dispensary has not listed their brands yet.
                            </p>
                        </section>

                    </div>

                    {/* Right Rail / Sticky Operator */}
                    <div className="lg:col-span-4 space-y-6">
                        <StickyOperatorBox
                            entityName={dispensary.name}
                            entityType="dispensary"
                            verificationStatus={'unverified'}  // Default for now
                        />

                        <Card className="bg-blue-50/50 border-blue-100">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-blue-900 mb-2">Fix your visibility</h3>
                                <p className="text-sm text-blue-800 mb-4">
                                    Claim this page to add your menu, update hours, and appear in search results for brands you carry.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
}
