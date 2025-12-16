
import { fetchBrandAvailabilitySummary } from '@/lib/brand-availability-data';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Building2, MapPin, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Brand Availability Index | BakedBot Research',
    description: 'Track where cannabis brands are actually on shelves. Distribution data across states and cities.',
    openGraph: {
        title: 'Brand Availability Index | BakedBot',
        description: 'Which brands have the widest distribution? Explore shelf availability by brand.',
        type: 'article'
    }
};

function getClassificationBadge(classification: string) {
    switch (classification) {
        case 'national':
            return <Badge className="gap-1 bg-purple-600"><Globe className="h-3 w-3" /> National</Badge>;
        case 'multi-state':
            return <Badge className="gap-1 bg-blue-600"><TrendingUp className="h-3 w-3" /> Multi-State</Badge>;
        case 'regional':
            return <Badge variant="secondary" className="gap-1"><Building2 className="h-3 w-3" /> Regional</Badge>;
        case 'local':
            return <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> Local</Badge>;
        default:
            return <Badge variant="outline">{classification}</Badge>;
    }
}

export default async function BrandAvailabilityPage() {
    const summary = await fetchBrandAvailabilitySummary();

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-purple-50 via-background to-background dark:from-purple-950/20 border-b pt-16 pb-12">
                <div className="container mx-auto px-4">
                    <Badge variant="secondary" className="mb-4">BakedBot Research</Badge>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Brand Availability Index
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl">
                        Where are cannabis brands actually on shelves? Track distribution footprints across states and retailers.
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                        Last Updated: {summary.lastUpdated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 space-y-12">

                {/* Summary Stats */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">Distribution Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold">{summary.totalBrandsTracked}</p>
                                <p className="text-sm text-muted-foreground">Total Brands</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-purple-600">{summary.nationalCount}</p>
                                <p className="text-sm text-purple-700">National</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-blue-600">{summary.multiStateCount}</p>
                                <p className="text-sm text-blue-700">Multi-State</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-slate-600">{summary.regionalCount}</p>
                                <p className="text-sm text-slate-700">Regional</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-gray-600">{summary.localCount}</p>
                                <p className="text-sm text-gray-700">Local</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Top Brands Table */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-purple-500" />
                                Top Distributed Brands
                            </CardTitle>
                            <CardDescription>
                                Brands with the widest retail footprint
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Brand</TableHead>
                                        <TableHead className="text-right">Retailers</TableHead>
                                        <TableHead className="text-right">States</TableHead>
                                        <TableHead className="text-right">Cities</TableHead>
                                        <TableHead className="text-right">Score</TableHead>
                                        <TableHead>Reach</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.topBrands.map((entry) => (
                                        <TableRow key={entry.brandSlug}>
                                            <TableCell>
                                                <Link
                                                    href={`/brands/${entry.brandSlug}`}
                                                    className="font-medium hover:text-primary hover:underline"
                                                >
                                                    {entry.brandName}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right">{entry.totalRetailers}</TableCell>
                                            <TableCell className="text-right">{entry.statesCovered.length}</TableCell>
                                            <TableCell className="text-right">{entry.citiesCovered}</TableCell>
                                            <TableCell className="text-right font-bold">{entry.availabilityScore}</TableCell>
                                            <TableCell>{getClassificationBadge(entry.classification)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </section>

                {/* For Brands CTA */}
                <section>
                    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="py-8 text-center">
                            <h3 className="text-2xl font-bold mb-2">Want to improve your distribution visibility?</h3>
                            <p className="text-muted-foreground mb-4">
                                Claim your brand page to control your presence and track real-time availability.
                            </p>
                            <Link href="/claim">
                                <Badge className="text-lg py-2 px-4 cursor-pointer hover:bg-primary/90">
                                    Claim Your Brand →
                                </Badge>
                            </Link>
                        </CardContent>
                    </Card>
                </section>

                {/* Citation Section */}
                <section>
                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle>How to Cite</CardTitle>
                            <CardDescription>
                                This data is free to use with attribution.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium mb-2">APA Format:</p>
                                <code className="block bg-background p-3 rounded text-sm">
                                    BakedBot. ({new Date().getFullYear()}). Brand Availability Index [Data set]. https://bakedbot.ai/data/brand-availability
                                </code>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">Embed Badge:</p>
                                <code className="block bg-background p-3 rounded text-xs overflow-x-auto">
                                    {`<a href="https://bakedbot.ai/data/brand-availability" target="_blank"><img src="https://bakedbot.ai/badges/data-source.svg" alt="Data from BakedBot" /></a>`}
                                </code>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Methodology */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>Methodology</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                            <p>
                                The Brand Availability Index tracks where brands appear in dispensary inventories:
                            </p>
                            <ul>
                                <li><strong>Data Source:</strong> Aggregated from menu scans across tracked dispensaries</li>
                                <li><strong>Score Calculation:</strong> Reach (states) + Depth (retailer count, log scale)</li>
                                <li><strong>National:</strong> 10+ states, 100+ retailers</li>
                                <li><strong>Multi-State:</strong> 3+ states, 25+ retailers</li>
                                <li><strong>Regional:</strong> 10+ retailers in concentrated area</li>
                                <li><strong>Local:</strong> Limited distribution footprint</li>
                            </ul>
                        </CardContent>
                    </Card>
                </section>

            </div>

            {/* Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Dataset',
                        name: 'Brand Availability Index',
                        description: 'Cannabis brand distribution and retail availability data',
                        creator: {
                            '@type': 'Organization',
                            name: 'BakedBot',
                            url: 'https://bakedbot.ai'
                        },
                        dateModified: summary.lastUpdated.toISOString(),
                        license: 'https://creativecommons.org/licenses/by/4.0/'
                    })
                }}
            />
        </main>
    );
}
