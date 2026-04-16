import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Database, BarChart3, ShieldCheck, Zap, Users, RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Cannabis Customer Data Platform (CDP) — First-Party Data for Dispensaries | BakedBot',
    description:
        'BakedBot is the cannabis customer data platform built for independent dispensaries. Capture first-party data at POS, build behavioral segments, and run automated retention campaigns — fully managed and compliance-reviewed.',
    openGraph: {
        title: 'Cannabis Customer Data Platform (CDP) — BakedBot',
        description: 'The first cannabis CDP purpose-built for independent operators. First-party data capture, AI segmentation, and automated campaigns — managed for you. Proven at Thrive Syracuse.',
        url: 'https://bakedbot.ai/cannabis-customer-data-platform',
    },
    alternates: { canonical: 'https://bakedbot.ai/cannabis-customer-data-platform' },
};

const cdpFeatures = [
    { icon: Database, title: 'First-party data ownership', description: 'Your customer data lives in your account. Captured via tablet check-in, QR codes, and POS integration — not rented from a third-party app.' },
    { icon: Users, title: 'Behavioral segmentation', description: 'AI segments customers by recency, frequency, monetary value, product category preference, and visit patterns — automatically updated on every transaction.' },
    { icon: BarChart3, title: 'Cross-channel profile unification', description: 'Customer data from your POS, loyalty flows, and check-in tablet merges into a single profile. No fragmentation across systems.' },
    { icon: RefreshCw, title: 'Real-time campaign triggers', description: 'When a customer\'s behavior crosses a threshold — 21 days since last visit, loyalty milestone reached, new product in their preferred category — a campaign fires.' },
    { icon: ShieldCheck, title: 'Cannabis-native compliance', description: 'Every outbound message is reviewed against state-specific cannabis advertising rules before send. 280E-aware. OCM-aligned for NY operators.' },
    { icon: Zap, title: 'Managed execution', description: 'You don\'t operate the CDP. Our AI agents run the segmentation, campaign logic, and optimization. You get a weekly performance report.' },
];

const whyCDP = [
    { q: 'Why does a dispensary need a CDP?', a: 'Because your POS tracks transactions but not customers. A CDP unifies purchase history, visit frequency, and channel engagement into a single customer profile — so your retention campaigns are based on real behavior, not guesses.' },
    { q: 'What makes a cannabis CDP different?', a: 'Cannabis regulations restrict what you can say, when you can say it, and how you can collect data. A generic CDP doesn\'t know about OCM guidelines, 280E implications, or state-by-state ad restrictions. BakedBot is purpose-built for cannabis.' },
    { q: 'How long does it take to see results?', a: 'Most operators see measurable retention lift within 30 days of deployment. That\'s why we offer a 30-day money-back guarantee — if the data doesn\'t show it, you don\'t pay.' },
];

export default function CannabisCustomerDataPlatformPage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Cannabis CDP
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            The cannabis customer data platform built for independent operators
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Generic CDPs don&#39;t understand cannabis compliance. Enterprise CDPs cost six figures. BakedBot is the first cannabis customer data platform purpose-built for single-location and small-chain dispensaries — with managed execution, so you get the data strategy without needing a data team.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get a free data audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Book a founder call</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Proof bar */}
            <section className="border-b border-border/40 bg-muted/30">
                <div className="container mx-auto px-4 py-5 max-w-5xl">
                    <p className="text-sm text-muted-foreground text-center">
                        <strong className="text-foreground">Live proof:</strong> Thrive Syracuse — social equity dispensary, NY. Full CDP stack live: Alleaves POS integrated, tablet check-in capturing first-party data, AI segmentation running daily, automated retention campaigns active.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What the BakedBot cannabis CDP delivers</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cdpFeatures.map((f) => (
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

            {/* FAQ / Why CDP */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-8 text-center">Why cannabis operators need a CDP</h2>
                    <div className="space-y-6">
                        {whyCDP.map((item) => (
                            <div key={item.q}>
                                <h3 className="font-semibold mb-2">{item.q}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">See how your customer data stacks up</h2>
                <p className="text-muted-foreground mb-8">Free data audit — we analyze your current customer capture rate and segmentation maturity, then show you exactly what you&#39;re missing.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free data audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">See pricing</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
