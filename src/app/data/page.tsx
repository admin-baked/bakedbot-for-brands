
import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin, Clock, ShoppingBag, Database } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Cannabis Data & Research | BakedBot',
    description: 'Free cannabis industry datasets: Desert Index, Freshness Index, and Brand Availability. Cite with attribution.',
    openGraph: {
        title: 'Cannabis Data & Research | BakedBot',
        description: 'Open cannabis industry data for researchers, journalists, and industry analysts.',
        type: 'website'
    }
};

const datasets = [
    {
        title: 'Cannabis Desert Index',
        description: 'ZIP-level cannabis access scores. Identify underserved markets and "cannabis deserts" across the US.',
        href: '/data/desert-index',
        icon: MapPin,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-900'
    },
    {
        title: 'Market Freshness Index',
        description: 'How often dispensary menus are updated by market. Identify active vs stale markets.',
        href: '/data/freshness-index',
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-900'
    },
    {
        title: 'Brand Availability Index',
        description: 'Where cannabis brands are on shelves. Track distribution footprints across states and retailers.',
        href: '/data/brand-availability',
        icon: ShoppingBag,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30',
        borderColor: 'border-purple-200 dark:border-purple-900'
    }
];

export default function DataIndexPage() {
    return (
        <main className="min-h-screen bg-background pb-20">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-50 via-background to-background dark:from-slate-950/50 border-b pt-16 pb-12">
                <div className="container mx-auto px-4 text-center">
                    <Badge variant="secondary" className="mb-4 gap-1">
                        <Database className="h-3 w-3" /> BakedBot Research
                    </Badge>
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                        Cannabis Industry Data
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                        Free, open datasets for researchers, journalists, investors, and industry analysts.
                        All data is updated regularly and free to cite with attribution.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 space-y-12">

                {/* Dataset Cards */}
                <section>
                    <h2 className="text-2xl font-bold mb-6">Available Datasets</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {datasets.map((dataset) => (
                            <Link key={dataset.href} href={dataset.href} className="group">
                                <Card className={`h-full transition-all hover:shadow-lg hover:border-primary ${dataset.bgColor} ${dataset.borderColor}`}>
                                    <CardHeader>
                                        <div className={`h-12 w-12 rounded-lg bg-background flex items-center justify-center mb-4`}>
                                            <dataset.icon className={`h-6 w-6 ${dataset.color}`} />
                                        </div>
                                        <CardTitle className="flex items-center justify-between">
                                            {dataset.title}
                                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <CardDescription className="text-sm">
                                            {dataset.description}
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* How to Use */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>How to Use This Data</CardTitle>
                        </CardHeader>
                        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                            <p>
                                All BakedBot datasets are released under <strong>Creative Commons Attribution 4.0</strong>.
                                You are free to:
                            </p>
                            <ul>
                                <li><strong>Share</strong> — copy and redistribute the data in any medium or format</li>
                                <li><strong>Adapt</strong> — remix, transform, and build upon the data for any purpose</li>
                            </ul>
                            <p>
                                <strong>Attribution Required:</strong> You must give appropriate credit, provide a link to the dataset,
                                and indicate if changes were made.
                            </p>
                            <h4>Citation Example (APA):</h4>
                            <code className="block bg-muted p-3 rounded text-sm not-prose">
                                BakedBot. (2025). Cannabis Desert Index [Data set]. https://bakedbot.ai/data/desert-index
                            </code>
                        </CardContent>
                    </Card>
                </section>

                {/* Data Source Badge */}
                <section>
                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle>Embed Our Badge</CardTitle>
                            <CardDescription>
                                Show that your research uses BakedBot data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <img
                                    src="/badges/data-source.svg"
                                    alt="Data from BakedBot"
                                    className="h-7"
                                />
                                <span className="text-sm text-muted-foreground">Preview</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">HTML Code:</p>
                                <code className="block bg-background p-3 rounded text-xs overflow-x-auto">
                                    {`<a href="https://bakedbot.ai/data" target="_blank"><img src="https://bakedbot.ai/badges/data-source.svg" alt="Data from BakedBot" /></a>`}
                                </code>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Contact for Research */}
                <section>
                    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="py-8 text-center">
                            <h3 className="text-2xl font-bold mb-2">Need Custom Data?</h3>
                            <p className="text-muted-foreground mb-4">
                                For academic research, custom data exports, or API access, contact our research team.
                            </p>
                            <Badge variant="secondary" className="text-sm">
                                research@bakedbot.ai
                            </Badge>
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
                        '@type': 'DataCatalog',
                        name: 'BakedBot Cannabis Data Catalog',
                        description: 'Open cannabis industry datasets for research',
                        url: 'https://bakedbot.ai/data',
                        publisher: {
                            '@type': 'Organization',
                            name: 'BakedBot',
                            url: 'https://bakedbot.ai'
                        },
                        dataset: datasets.map(d => ({
                            '@type': 'Dataset',
                            name: d.title,
                            description: d.description,
                            url: `https://bakedbot.ai${d.href}`
                        }))
                    })
                }}
            />
        </main>
    );
}
