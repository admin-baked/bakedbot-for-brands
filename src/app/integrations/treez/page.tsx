import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plug, BarChart3, RefreshCw, ShieldCheck, Users, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot + Treez Integration — AI Retention for Treez Dispensaries',
    description:
        'BakedBot integrates with Treez POS to deliver AI-powered customer retention, behavioral segmentation, and automated lifecycle campaigns for cannabis dispensaries. Layer intelligence on top of your existing Treez setup.',
    openGraph: {
        title: 'BakedBot + Treez Integration — AI Retention for Treez Dispensaries',
        description: 'Running Treez? BakedBot adds managed AI retention, competitive intel, and automated campaigns on top of your Treez POS data — without replacing your existing stack.',
        url: 'https://bakedbot.ai/integrations/treez',
    },
    alternates: { canonical: 'https://bakedbot.ai/integrations/treez' },
};

const features = [
    { icon: Plug, title: 'Treez transaction sync', description: 'BakedBot pulls customer and transaction data from Treez to build behavioral profiles — automatically, on every sale.' },
    { icon: Users, title: 'RFM segmentation', description: 'Recency, frequency, and monetary value scoring runs automatically from Treez data. Every customer segment has a different retention strategy.' },
    { icon: RefreshCw, title: 'Automated lifecycle campaigns', description: 'Welcome sequences, win-back flows, and loyalty campaigns trigger based on actual Treez transaction behavior — not calendar reminders.' },
    { icon: TrendingUp, title: 'Competitive intelligence', description: 'While Treez tracks your sales, BakedBot tracks what your competitors are selling and pricing — daily across every market you operate in.' },
    { icon: ShieldCheck, title: 'Compliance review', description: 'Every customer-facing campaign reviewed against state cannabis advertising rules before send. Works across all Treez markets.' },
    { icon: BarChart3, title: 'Weekly revenue attribution', description: 'Plain-English weekly report tying every BakedBot campaign back to real Treez transactions — so you can see the ROI.' },
];

export default function TreezIntegrationPage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Treez integration
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            Turn your Treez transaction data into a retention engine
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Treez runs your point of sale. BakedBot turns that data into automated retention campaigns, AI segmentation, and competitive intelligence — managed for you, reported weekly. No new POS. No new tech stack to manage.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get a free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Book a demo</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What Treez + BakedBot delivers</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div key={f.title} className="flex gap-3">
                            <f.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{f.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-6">
                            <p className="font-semibold text-emerald-800 mb-2">Proven integration architecture</p>
                            <p className="text-sm text-muted-foreground">Thrive Syracuse runs Alleaves POS with BakedBot layered on top — the same data-layer architecture we use with Treez. POS data flows into BakedBot, AI segmentation runs on top, campaigns fire on behavior triggers. The pattern is proven. The only variable is your POS.</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Running Treez? Let&#39;s show you what&#39;s possible.</h2>
                <p className="text-muted-foreground mb-8">Free retention audit. We use your market data to show exactly where your customers are going — and what it costs.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">Pricing</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
