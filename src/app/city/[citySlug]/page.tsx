
import { fetchCityPageData } from '@/lib/city-data';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RetailerMap } from '@/components/maps/retailer-map';
import { MapPin, ChevronRight, Store } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string }> }): Promise<Metadata> {
    const { citySlug } = await params;
    const { city } = await fetchCityPageData(citySlug);

    if (!city) return { title: 'City Not Found' };

    return {
        title: `Cannabis Dispensaries in ${city.name}, ${city.state} | BakedBot`,
        description: `Find the best weed in ${city.name}, ${city.state}. Browse ${city.dispensaryCount} licensed dispensaries, view menus, and find exclusive deals near you.`,
    };
}

export default async function CityPage({ params }: { params: Promise<{ citySlug: string }> }) {
    const { citySlug } = await params;
    const { city, dispensaries } = await fetchCityPageData(citySlug);

    if (!city) {
        notFound();
    }

    // Dynamic FAQ Data
    const faqs = [
        {
            question: `Is cannabis legal in ${city.name}?`,
            answer: `Yes, cannabis is legal for adults in ${city.state}. You can purchase it from licensed dispensaries in ${city.name}.`
        },
        {
            question: `How many dispensaries are in ${city.name}, ${city.state}?`,
            answer: `There are currently ${dispensaries.length} licensed dispensaries listed on BakedBot for ${city.name}.`
        },
        {
            question: `Do I need a medical card in ${city.name}?`,
            answer: `If you are 21 or older, you do not need a medical card to purchase recreational cannabis in ${city.state}. Medical cards are required for medical-only dispensaries.`
        }
    ];

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Simple Header */}
            <div className="bg-gradient-to-b from-secondary/50 to-background border-b pt-12 pb-8">
                <div className="container mx-auto px-4 text-center">
                    <Badge variant="outline" className="mb-4 bg-background">
                        {city.state} Cannabis Guide
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Dispensaries in {city.name}, {city.state}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Discover the best cannabis retailers in {city.name}. Find store hours, menus, and exclusive deals at {dispensaries.length} locations.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Editorial Intro */}
                        {city.editorialIntro && (
                            <section className="prose prose-gray max-w-none">
                                <h2 className="text-2xl font-bold mb-4">{city.name} Cannabis Guide</h2>
                                <div dangerouslySetInnerHTML={{ __html: city.editorialIntro }} />
                            </section>
                        )}

                        {/* Interactive Map */}
                        {dispensaries.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-4">Map View</h2>
                                <RetailerMap
                                    retailers={dispensaries.map(r => ({
                                        id: r.id,
                                        name: r.name,
                                        address: r.address || `${city.name}, ${city.state}`,
                                        lat: r.lat,
                                        lng: r.lon
                                    }))}
                                    height="400px"
                                />
                            </section>
                        )}

                        {/* Zip Codes */}
                        {city.zipCodes && city.zipCodes.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold mb-4">Find by Zip Code</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {city.zipCodes.map((zip) => (
                                        <Button key={zip} variant="outline" asChild className="w-full">
                                            <Link href={`/shop/${zip}-dispensary`}>
                                                {zip} Dispensaries
                                            </Link>
                                        </Button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Dispensary List */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4">All Dispensaries</h2>
                            <div className="grid gap-4">
                                {dispensaries.length > 0 ? (
                                    dispensaries.map((retailer) => (
                                        <Card key={retailer.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Store className="h-4 w-4 text-primary" />
                                                        <h3 className="font-semibold text-lg">{retailer.name}</h3>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground flex items-center">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {retailer.address}, {retailer.city}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <Badge variant="secondary" className="text-xs">
                                                            Licensed
                                                        </Badge>
                                                        {retailer.status === 'active' && (
                                                            <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                                                                Open
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button asChild>
                                                    <Link href={`/dispensaries/${retailer.id}`}>
                                                        View Menu <ChevronRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                                        <p>No dispensaries found in our directory for this city.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* FAQ Section */}
                        <section>
                            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
                            <Accordion type="single" collapsible className="w-full">
                                {faqs.map((faq, index) => (
                                    <AccordionItem key={index} value={`item-${index}`}>
                                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                                        <AccordionContent>
                                            {faq.answer}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </section>

                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Search / Nav */}
                        <div className="p-6 bg-muted/30 rounded-lg border">
                            <h3 className="font-semibold mb-4">Nearby Cities</h3>
                            <ul className="space-y-2 text-sm">
                                {/* Placeholder for nearby cities logic */}
                                <li>
                                    <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                        Dispensaries in {city.name} Neighborhood A
                                    </Link>
                                </li>
                                <li>
                                    <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                                        Dispensaries in {city.name} Neighborhood B
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>

            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        name: `Dispensaries in ${city.name}, ${city.state}`,
                        description: `Find local dispensaries and products in ${city.name}.`,
                        mainEntity: {
                            '@type': 'ItemList',
                            itemListElement: dispensaries.map((d, i) => ({
                                '@type': 'ListItem',
                                position: i + 1,
                                item: {
                                    '@type': 'LocalBusiness',
                                    name: d.name,
                                    address: {
                                        '@type': 'PostalAddress',
                                        streetAddress: d.address,
                                        addressLocality: d.city,
                                        addressRegion: d.state
                                    }
                                }
                            }))
                        }
                    })
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: faqs.map(f => ({
                            '@type': 'Question',
                            name: f.question,
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: f.answer
                            }
                        }))
                    })
                }}
            />
        </main>
    );
}
