
import { fetchStatePageData } from '@/lib/state-data';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MapPin, ArrowRight } from 'lucide-react';

// Helper to ensure we match the Firestore ID format
function normalizeStateSlug(slug: string) {
    if (slug.startsWith('state_')) return slug;
    return `state_${slug}`;
}

export async function generateMetadata({ params }: { params: Promise<{ stateSlug: string }> }): Promise<Metadata> {
    const { stateSlug } = await params;
    const docId = normalizeStateSlug(stateSlug);
    const stateData = await fetchStatePageData(docId);

    if (!stateData) return { title: 'State Not Found' };

    return {
        title: `Cannabis Dispensaries in ${stateData.name} | BakedBot`,
        description: `Complete guide to ${stateData.name} cannabis. Find licensed dispensaries in ${stateData.topCities?.length || 0} cities, check legal status, and browse local menus.`,
    };
}

export default async function StatePage({ params }: { params: Promise<{ stateSlug: string }> }) {
    const { stateSlug } = await params;
    const docId = normalizeStateSlug(stateSlug);
    const stateData = await fetchStatePageData(docId);

    if (!stateData) {
        notFound();
    }

    const { name, topCities } = stateData;

    // Dynamic FAQ Data
    const faqs = [
        {
            question: `Is cannabis legal in ${name}?`,
            answer: `The legal status of cannabis in ${name} depends on state laws. Please check the latest regulations for recreational and medical use in ${name}.`
        },
        {
            question: `How many dispensaries are in ${name}?`,
            answer: `BakedBot tracks licensed dispensaries across ${name}. Browse our city guides to find locations near you.`
        },
        {
            question: `Where can I buy weed in ${name}?`,
            answer: `You can purchase cannabis from licensed retailers in major cities like ${topCities.slice(0, 3).map(c => c.name).join(', ')}.`
        }
    ];

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b pt-16 pb-12">
                <div className="container mx-auto px-4 text-center">
                    <Badge variant="outline" className="mb-4 bg-background">
                        State Guide
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                        Cannabis in <span className="text-primary">{name}</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Your complete directory for dispensaries, deliveries, and deals across the state of {name}.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Main Content */}
                <div className="lg:col-span-2 space-y-12">

                    {/* Top Cities Grid */}
                    <section>
                        <h2 className="text-3xl font-bold mb-6">Popular Cities in {name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {topCities && topCities.length > 0 ? (
                                topCities.map((city) => (
                                    <Link key={city.slug} href={`/cities/${city.slug}`} className="group">
                                        <Card className="h-full hover:border-primary transition-colors hover:shadow-md">
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                                        {city.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {city.count} Dispensaries
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-muted-foreground col-span-2">
                                    No cities currently tracked in {name}.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* FAQ Section */}
                    <section>
                        <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-lg">{faq.question}</AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </section>

                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <Card className="bg-muted/50 border-none">
                        <CardHeader>
                            <CardTitle>State Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-muted-foreground/10">
                                <span className="text-muted-foreground">Total Cities</span>
                                <span className="font-bold text-xl">{topCities?.length || 0}</span>
                            </div>
                            {/* Placeholder for real stats */}
                            <div className="flex justify-between items-center pb-4 border-b border-muted-foreground/10">
                                <span className="text-muted-foreground">Tax Rate (Est.)</span>
                                <span className="font-bold text-xl">~15%</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Internal link to coverage map or similar */}
                    <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                        <h3 className="font-bold text-lg mb-2">Coverage Map</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            See our full coverage area across {name} and neighboring states.
                        </p>
                        <Badge variant="secondary" className="bg-background">Coming Soon</Badge>
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
                        name: `Cannabis Dispensaries in ${name}`,
                        description: `Find local dispensaries and products in ${name}.`,
                        mainEntity: topCities.map((c: any, i: number) => ({
                            '@type': 'ListItem',
                            position: i + 1,
                            url: `https://bakedbot.app/cities/${c.slug}`,
                            name: c.name
                        }))
                    })
                }}
            />
        </main>
    );
}
