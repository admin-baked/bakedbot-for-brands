
import { fetchDesertIndexSummary } from '@/lib/desert-index-data';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, MapPin, TrendingDown, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Cannabis Desert Index | BakedBot Research',
    description: 'ZIP-level cannabis access data revealing underserved markets across the US. Free to cite with attribution.',
    openGraph: {
        title: 'Cannabis Desert Index | BakedBot',
        description: 'Which communities lack cannabis access? Explore ZIP-level data on dispensary coverage.',
        type: 'article'
    }
};

function getClassificationBadge(classification: string) {
    switch (classification) {
        case 'desert':
            return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Desert</Badge>;
        case 'underserved':
            return <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300"><TrendingDown className="h-3 w-3" /> Underserved</Badge>;
        case 'adequate':
            return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Adequate</Badge>;
        case 'saturated':
            return <Badge className="gap-1 bg-green-600"><TrendingUp className="h-3 w-3" /> Saturated</Badge>;
        default:
            return <Badge variant="outline">{classification}</Badge>;
    }
}

export default async function DesertIndexPage() {
    const summary = await fetchDesertIndexSummary();

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-amber-50 via-background to-background dark:from-amber-950/20 border-b pt-16 pb-12">
                <div className="container mx-auto px-4">
                    <Badge variant="secondary" className="mb-4">BakedBot Research</Badge>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Cannabis Desert Index
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl">
                        Quantifying cannabis access gaps across America. This dataset reveals which ZIP codes are "cannabis deserts" — areas with limited or no dispensary access.
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                        Last Updated: {summary.lastUpdated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 space-y-12">

                {/* Summary Stats */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">National Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-red-600">{summary.desertCount}</p>
                                <p className="text-sm text-red-700">Cannabis Deserts</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-orange-600">{summary.underservedCount}</p>
                                <p className="text-sm text-orange-700">Underserved</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-blue-600">{summary.adequateCount}</p>
                                <p className="text-sm text-blue-700">Adequate Access</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-green-600">{summary.saturatedCount}</p>
                                <p className="text-sm text-green-700">Saturated</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Worst Deserts Table */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                Top Cannabis Deserts
                            </CardTitle>
                            <CardDescription>
                                ZIP codes with the lowest cannabis access scores
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ZIP Code</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead className="text-right">Access Score</TableHead>
                                        <TableHead className="text-right">Dispensaries</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.topDeserts.map((entry) => (
                                        <TableRow key={entry.zipCode}>
                                            <TableCell className="font-mono">{entry.zipCode}</TableCell>
                                            <TableCell>{entry.city}</TableCell>
                                            <TableCell>{entry.state}</TableCell>
                                            <TableCell className="text-right font-bold">{entry.accessScore}</TableCell>
                                            <TableCell className="text-right">{entry.dispensaryCount}</TableCell>
                                            <TableCell>{getClassificationBadge(entry.classification)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </section>

                {/* Best Served Areas */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Best Served Markets
                            </CardTitle>
                            <CardDescription>
                                ZIP codes with the highest cannabis access
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ZIP Code</TableHead>
                                        <TableHead>City</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead className="text-right">Access Score</TableHead>
                                        <TableHead className="text-right">Dispensaries</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.topSaturated.map((entry) => (
                                        <TableRow key={entry.zipCode}>
                                            <TableCell className="font-mono">{entry.zipCode}</TableCell>
                                            <TableCell>{entry.city}</TableCell>
                                            <TableCell>{entry.state}</TableCell>
                                            <TableCell className="text-right font-bold">{entry.accessScore}</TableCell>
                                            <TableCell className="text-right">{entry.dispensaryCount}</TableCell>
                                            <TableCell>{getClassificationBadge(entry.classification)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
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
                                    BakedBot. ({new Date().getFullYear()}). Cannabis Desert Index [Data set]. https://bakedbot.ai/data/desert-index
                                </code>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">Embed Badge:</p>
                                <code className="block bg-background p-3 rounded text-xs overflow-x-auto">
                                    {`<a href="https://bakedbot.ai/data/desert-index" target="_blank"><img src="https://bakedbot.ai/badges/data-source.svg" alt="Data from BakedBot" /></a>`}
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
                                The Cannabis Desert Index score (0-100) is calculated using two primary factors:
                            </p>
                            <ul>
                                <li><strong>Dispensary Count Score (0-50 points):</strong> More dispensaries = higher score, with diminishing returns after 5 locations.</li>
                                <li><strong>Distance Score (0-50 points):</strong> Shorter average distance to nearest dispensary = higher score. 0 miles = 50 points; 10+ miles = 0 points.</li>
                            </ul>
                            <p>
                                <strong>Classifications:</strong>
                            </p>
                            <ul>
                                <li><strong>Desert (0-19):</strong> Zero or extremely limited access</li>
                                <li><strong>Underserved (20-39):</strong> Below average access</li>
                                <li><strong>Adequate (40-69):</strong> Average access levels</li>
                                <li><strong>Saturated (70-100):</strong> High density of dispensaries</li>
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
                        name: 'Cannabis Desert Index',
                        description: 'ZIP-level cannabis access scores across the United States',
                        creator: {
                            '@type': 'Organization',
                            name: 'BakedBot',
                            url: 'https://bakedbot.ai'
                        },
                        dateModified: summary.lastUpdated.toISOString(),
                        license: 'https://creativecommons.org/licenses/by/4.0/',
                        distribution: {
                            '@type': 'DataDownload',
                            encodingFormat: 'text/html',
                            contentUrl: 'https://bakedbot.ai/data/desert-index'
                        }
                    })
                }}
            />
        </main>
    );
}
