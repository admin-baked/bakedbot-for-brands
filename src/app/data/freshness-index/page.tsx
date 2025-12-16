
import { fetchFreshnessIndexSummary } from '@/lib/freshness-index-data';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, RefreshCw, AlertCircle, Zap } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Market Freshness Index | BakedBot Research',
    description: 'Real-time data on how often cannabis dispensary menus are updated by market. Identify active vs stale markets.',
    openGraph: {
        title: 'Market Freshness Index | BakedBot',
        description: 'Which markets have the freshest dispensary data? Explore menu update frequency by city.',
        type: 'article'
    }
};

function getClassificationBadge(classification: string) {
    switch (classification) {
        case 'fresh':
            return <Badge className="gap-1 bg-green-600"><Zap className="h-3 w-3" /> Fresh</Badge>;
        case 'active':
            return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" /> Active</Badge>;
        case 'aging':
            return <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300"><Clock className="h-3 w-3" /> Aging</Badge>;
        case 'stale':
            return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Stale</Badge>;
        default:
            return <Badge variant="outline">{classification}</Badge>;
    }
}

export default async function FreshnessIndexPage() {
    const summary = await fetchFreshnessIndexSummary();

    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-blue-50 via-background to-background dark:from-blue-950/20 border-b pt-16 pb-12">
                <div className="container mx-auto px-4">
                    <Badge variant="secondary" className="mb-4">BakedBot Research</Badge>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Market Freshness Index
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl">
                        Tracking how often dispensary menus are updated across markets. Fresh data signals active, well-maintained dispensaries.
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
                        <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-green-600">{summary.freshCount}</p>
                                <p className="text-sm text-green-700">Fresh Markets</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-blue-600">{summary.activeCount}</p>
                                <p className="text-sm text-blue-700">Active Markets</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-orange-600">{summary.agingCount}</p>
                                <p className="text-sm text-orange-700">Aging Markets</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
                            <CardContent className="pt-6 text-center">
                                <p className="text-4xl font-bold text-red-600">{summary.staleCount}</p>
                                <p className="text-sm text-red-700">Stale Markets</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Freshest Markets Table */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-green-500" />
                                Freshest Markets
                            </CardTitle>
                            <CardDescription>
                                Cities with the most up-to-date dispensary data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>City</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead className="text-right">Dispensaries</TableHead>
                                        <TableHead className="text-right">Avg Days Since Update</TableHead>
                                        <TableHead className="text-right">Freshness Score</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.topFreshMarkets.map((entry) => (
                                        <TableRow key={`${entry.city}-${entry.state}`}>
                                            <TableCell className="font-medium">{entry.city}</TableCell>
                                            <TableCell>{entry.state}</TableCell>
                                            <TableCell className="text-right">{entry.dispensaryCount}</TableCell>
                                            <TableCell className="text-right">{entry.avgDaysSinceUpdate} days</TableCell>
                                            <TableCell className="text-right font-bold">{entry.freshnessScore}</TableCell>
                                            <TableCell>{getClassificationBadge(entry.classification)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </section>

                {/* Stalest Markets */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                Markets Needing Attention
                            </CardTitle>
                            <CardDescription>
                                Cities where dispensary data may be outdated
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>City</TableHead>
                                        <TableHead>State</TableHead>
                                        <TableHead className="text-right">Dispensaries</TableHead>
                                        <TableHead className="text-right">Avg Days Since Update</TableHead>
                                        <TableHead className="text-right">Freshness Score</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.topStaleMarkets.map((entry) => (
                                        <TableRow key={`${entry.city}-${entry.state}`}>
                                            <TableCell className="font-medium">{entry.city}</TableCell>
                                            <TableCell>{entry.state}</TableCell>
                                            <TableCell className="text-right">{entry.dispensaryCount}</TableCell>
                                            <TableCell className="text-right">{entry.avgDaysSinceUpdate} days</TableCell>
                                            <TableCell className="text-right font-bold">{entry.freshnessScore}</TableCell>
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
                                    BakedBot. ({new Date().getFullYear()}). Market Freshness Index [Data set]. https://bakedbot.ai/data/freshness-index
                                </code>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">Embed Badge:</p>
                                <code className="block bg-background p-3 rounded text-xs overflow-x-auto">
                                    {`<a href="https://bakedbot.ai/data/freshness-index" target="_blank"><img src="https://bakedbot.ai/badges/data-source.svg" alt="Data from BakedBot" /></a>`}
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
                                The Market Freshness Index (0-100) measures how recently dispensary menus have been updated:
                            </p>
                            <ul>
                                <li><strong>Score Calculation:</strong> 100 - (Average Days Since Update × 3.33)</li>
                                <li><strong>Fresh (80-100):</strong> Menus updated within the last week</li>
                                <li><strong>Active (50-79):</strong> Regular updates, data generally current</li>
                                <li><strong>Aging (20-49):</strong> Updates becoming infrequent</li>
                                <li><strong>Stale (0-19):</strong> 30+ days without updates, data may be unreliable</li>
                            </ul>
                            <p>
                                Data is aggregated by city from individual dispensary menu timestamps tracked via CannMenus integration.
                            </p>
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
                        name: 'Market Freshness Index',
                        description: 'Cannabis dispensary menu update frequency by market',
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
