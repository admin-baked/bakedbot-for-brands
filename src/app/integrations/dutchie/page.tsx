import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Bot, BarChart3, RefreshCw, ShieldCheck, Users, CheckCircle2, Eye } from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot + Dutchie Integration — AI Agents Manage Your Dutchie Dispensary',
    description:
        'BakedBot\'s AI agents log into your Dutchie back office, pull customer and transaction data, and run automated retention campaigns — fully managed, no API required. Keep your Dutchie stack, add the intelligence layer it\'s missing.',
    openGraph: {
        title: 'BakedBot + Dutchie Integration — AI Agents Manage Your Dutchie Dispensary',
        description: 'BakedBot AI agents log into Dutchie, read your transaction data, and run retention campaigns on your behalf — no native API needed. Managed execution for Dutchie dispensaries.',
        url: 'https://bakedbot.ai/integrations/dutchie',
    },
    alternates: { canonical: 'https://bakedbot.ai/integrations/dutchie' },
};

const integrationFeatures = [
    {
        icon: Bot,
        title: 'AI agents log in and do the work',
        description: 'BakedBot\'s agents authenticate into your Dutchie back office using your credentials and pull the data they need — customer records, transaction history, product performance — without any manual exports or API setup.',
    },
    {
        icon: Eye,
        title: 'Full Dutchie visibility without extra work',
        description: 'Agents read your Dutchie reports, customer lists, and sales data the same way you would — then hand it to the retention and segmentation layer automatically. You never touch a spreadsheet.',
    },
    {
        icon: Users,
        title: 'Customer profiles built from Dutchie data',
        description: 'Transaction history from Dutchie gets merged into BakedBot customer profiles enriched with recency scores, product preference segments, and campaign engagement history.',
    },
    {
        icon: RefreshCw,
        title: 'Behavior-triggered campaigns',
        description: 'When a Dutchie customer crosses a retention threshold — lapsed visit, loyalty milestone, new product in their category — an automated campaign fires. No manual trigger required.',
    },
    {
        icon: BarChart3,
        title: 'Revenue attribution',
        description: 'Campaign outcomes are tied back to Dutchie transactions. Your weekly report shows exactly which automated flow generated which revenue — per customer, per campaign.',
    },
    {
        icon: ShieldCheck,
        title: 'Compliance review on every send',
        description: 'Every customer message is reviewed for cannabis advertising compliance before it reaches a customer — regardless of which state your Dutchie account operates in.',
    },
    {
        icon: CheckCircle2,
        title: 'No disruption to your Dutchie setup',
        description: 'BakedBot is additive, not a replacement. Your Dutchie POS workflows, staff training, and vendor relationships stay exactly as they are.',
    },
];

const howAgentsWork = [
    { step: '1', title: 'Secure credential handoff', detail: 'You provide your Dutchie back-office credentials once, encrypted and stored in your BakedBot account. BakedBot agents use them to authenticate on your behalf.' },
    { step: '2', title: 'Daily data pull', detail: 'Agents log into Dutchie each morning, read the previous day\'s transactions and customer activity, and sync the data into BakedBot\'s retention engine.' },
    { step: '3', title: 'Segmentation update', detail: 'Customer profiles are updated automatically — recency, frequency, spend tier, and product preferences recalculated from fresh Dutchie data.' },
    { step: '4', title: 'Campaign execution', detail: 'Based on updated segments, campaigns fire: welcome sequences for new customers, win-back messages for lapsed ones, loyalty milestones for regulars.' },
    { step: '5', title: 'Weekly report', detail: 'A plain-English report lands in your inbox showing what the agents did, what Dutchie data drove the decisions, and what revenue the campaigns influenced.' },
];

export default function DutchieIntegrationPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Dutchie integration
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            AI agents that log into Dutchie and manage your retention — for you
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            BakedBot doesn&#39;t require a Dutchie API partnership. Our AI agents authenticate into your Dutchie back office, pull your customer and transaction data daily, and run the entire retention loop automatically. You stay on Dutchie. We add the intelligence layer it&#39;s missing.
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

            {/* How agents work */}
            <section className="border-b border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <h2 className="text-xl font-bold mb-6">How BakedBot agents work with Dutchie</h2>
                    <div className="space-y-4">
                        {howAgentsWork.map((s) => (
                            <div key={s.step} className="flex gap-4 items-start">
                                <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.step}</div>
                                <div>
                                    <span className="font-semibold text-sm">{s.title}: </span>
                                    <span className="text-sm text-muted-foreground">{s.detail}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-3">What the Dutchie + BakedBot integration delivers</h2>
                <p className="text-muted-foreground mb-10">Dutchie handles the transaction. BakedBot&#39;s agents handle everything that turns that transaction into a repeat visit.</p>
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

            {/* Proof */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <Card className="border-emerald-200 bg-emerald-50/50">
                        <CardContent className="p-6">
                            <h3 className="font-bold mb-2">Thrive Syracuse — the same agent architecture, live today</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">Thrive Syracuse runs Alleaves POS with BakedBot agents managing the data layer on top. Agents authenticate into Alleaves daily, pull transaction data, update customer segments, fire retention campaigns, and report back. That same agent-driven architecture is how we work with Dutchie — no API partnership required, just your credentials and your goals.</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Running Dutchie? Let&#39;s audit your retention.</h2>
                <p className="text-muted-foreground mb-8">Free retention audit for Dutchie dispensaries. We analyze your customer patterns and show you exactly where the revenue gap is. No commitment required.</p>
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
