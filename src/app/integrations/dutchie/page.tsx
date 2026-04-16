import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plug, BarChart3, RefreshCw, ShieldCheck, Users, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot + Dutchie Integration — AI Retention for Dutchie Dispensaries',
    description:
        'BakedBot connects to Dutchie POS to power AI-driven customer retention, segmentation, and automated campaigns for cannabis dispensaries. Keep your Dutchie stack — add managed AI execution on top.',
    openGraph: {
        title: 'BakedBot + Dutchie Integration — AI Retention for Dutchie Dispensaries',
        description: 'Already running Dutchie? BakedBot layers AI retention, competitive intelligence, and automated campaigns on top of your existing Dutchie POS — no replacement required.',
        url: 'https://bakedbot.ai/integrations/dutchie',
    },
    alternates: { canonical: 'https://bakedbot.ai/integrations/dutchie' },
};

const integrationFeatures = [
    { icon: Plug, title: 'Native POS sync', description: 'BakedBot pulls transaction data from Dutchie automatically — purchase history, product preferences, visit frequency — without manual exports.' },
    { icon: Users, title: 'Customer profile unification', description: 'Dutchie customer records merge into BakedBot profiles enriched with behavioral segments, recency scores, and campaign engagement history.' },
    { icon: RefreshCw, title: 'Behavior-triggered campaigns', description: 'When a Dutchie customer crosses a retention threshold — lapsed visit, product restock, loyalty milestone — an automated campaign fires.' },
    { icon: BarChart3, title: 'Revenue attribution', description: 'Campaign results are tied back to Dutchie transactions. You see exactly which automated flow generated which revenue — per customer.' },
    { icon: ShieldCheck, title: 'Compliance pre-check', description: 'Every customer message is reviewed for cannabis advertising compliance before send — regardless of what state your Dutchie account operates in.' },
    { icon: CheckCircle2, title: 'No disruption to your Dutchie setup', description: 'BakedBot is additive — not a replacement. Your Dutchie POS workflows stay exactly as they are.' },
];

export default function DutchieIntegrationPage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Dutchie integration
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            AI retention for Dutchie dispensaries — no replacement required
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Dutchie runs your point of sale. BakedBot layers managed AI execution on top — turning your Dutchie transaction data into automated retention campaigns, competitive intelligence, and weekly KPI reports. Keep your existing stack. Add the intelligence layer it&#39;s missing.
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
                <h2 className="text-2xl font-bold mb-3">What the Dutchie + BakedBot integration delivers</h2>
                <p className="text-muted-foreground mb-10">Dutchie handles the transaction. BakedBot handles everything that turns that transaction into a repeat visit.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {integrationFeatures.map((f) => (
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
                            <h3 className="font-bold mb-2">Thrive Syracuse — Alleaves → BakedBot: the same pattern</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">Thrive Syracuse runs Alleaves POS with BakedBot layered on top — the same integration architecture that works with Dutchie. Transaction data flows into BakedBot, AI segmentation runs automatically, campaigns fire on behavior triggers, and a weekly report closes the loop. This is the proven pattern.</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Running Dutchie? Let&#39;s audit your retention.</h2>
                <p className="text-muted-foreground mb-8">Free retention audit for Dutchie dispensaries. We analyze your customer patterns and show you where the revenue gap is. No commitment required.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/ai-retention-audit">Free retention audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/pricing">See pricing</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
