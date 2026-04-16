import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowRight,
    MapPin,
    Users,
    Zap,
    ShieldCheck,
    BarChart3,
    Bot,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'About BakedBot AI — Built by Operators, for Operators',
    description:
        'BakedBot AI is the managed AI operating layer for cannabis dispensaries. Founded by Martez Robinson with a mission to give independent operators the same data edge as the big chains. Learn our story.',
    openGraph: {
        title: 'About BakedBot AI — Built by Operators, for Operators',
        description:
            'Martez Robinson founded BakedBot to give independent cannabis dispensaries the same competitive intelligence and retention tools as the biggest chains — without the enterprise price tag.',
        url: 'https://bakedbot.ai/about',
        type: 'website',
    },
    alternates: { canonical: 'https://bakedbot.ai/about' },
};

const founders = [
    {
        name: 'Martez Robinson',
        title: 'Founder & CEO',
        bio: `Martez has spent his career at the intersection of technology and underserved markets. He founded BakedBot after watching independent cannabis dispensaries in New York lose customers to better-capitalized chains — not because they had worse products, but because they had worse data. He built BakedBot to close that gap: giving independent operators the same AI-powered retention, competitive intelligence, and compliance tooling that enterprise operators pay six figures for, delivered as a managed service at a price that actually works for a single-location owner.`,
        credential: 'Founder, BakedBot AI',
        location: 'New York',
        href: '/book',
        cta: 'Book a call with Martez',
        image: null,
        color: 'emerald',
    },
    {
        name: 'Jack',
        title: 'Head of Revenue',
        bio: `Jack is BakedBot's Head of Revenue — the first person a dispensary operator talks to when they're serious about growing. His job is pipeline velocity: qualifying every inbound lead within two hours, running the founding partner offer, and making sure every operator who books a demo understands exactly what BakedBot delivers in the first 30 days. Jack is the reason BakedBot closes.`,
        credential: 'Head of Revenue, BakedBot AI',
        location: 'Available across all markets',
        href: '/book',
        cta: 'Book a call with Jack',
        image: null,
        color: 'indigo',
    },
];

const milestones = [
    { year: '2024', label: 'BakedBot founded', detail: 'Started with a simple question: why can\'t independent dispensaries get the same retention tools as the chains?' },
    { year: '2025', label: 'First operator live', detail: 'Thrive Syracuse goes live on Access Complete — check-in tablet deployed, Alleaves POS integrated, daily competitive tracking running.' },
    { year: '2026', label: 'NY market expansion', detail: '604 licensed dispensaries in pipeline. 13 rotating email templates. 20+ AI agents running daily automation.' },
    { year: 'Now', label: 'Founding partner program open', detail: '10 founding partner slots at locked pricing before list price increases. First-come, not first-asked.' },
];

const values = [
    {
        icon: Users,
        title: 'Operators first',
        description: 'We built for the single-location owner doing $1.5M a year who can\'t afford a marketing team. Not for enterprise MSOs with 50-person tech stacks.',
    },
    {
        icon: BarChart3,
        title: 'Revenue you can attribute',
        description: 'Every feature we ship has to move a number you can see on your P&L. Impressions and "engagement" are not metrics we celebrate.',
    },
    {
        icon: ShieldCheck,
        title: 'Compliance built in',
        description: 'Our compliance agent Deebo reviews every campaign before it sends. OCM-aligned. 280E-aware. No generic AI that ignores cannabis regulations.',
    },
    {
        icon: Zap,
        title: 'Managed, not SaaS',
        description: 'You don\'t manage us. We deliver outcomes and send you a weekly report. If we can\'t show ROI in 30 days, you get your money back.',
    },
    {
        icon: Bot,
        title: 'Proof-first selling',
        description: 'We start with a free competitive snapshot before asking for a dollar. We earn the relationship before we ask for the contract.',
    },
    {
        icon: MapPin,
        title: 'Local market depth',
        description: 'We\'re not a generic AI company that happened to discover cannabis. We track pricing, menus, and foot traffic across hundreds of markets daily.',
    },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl text-center">
                    <Badge variant="outline" className="mb-6 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        Our story
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                        Built for the dispensary owner<br className="hidden sm:block" /> who&#39;s doing everything themselves
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        BakedBot is the AI operating layer for cannabis dispensaries. We run retention,
                        competitive intel, and weekly reporting automatically — so operators can focus on
                        the floor, not a dashboard.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                        <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                            <Link href="/ai-retention-audit">
                                Get a free audit <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <Link href="/book">Book a founder call</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Origin Story */}
            <section className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="prose prose-lg max-w-none">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6">Why we built this</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Independent cannabis dispensaries are getting squeezed from both sides. On one side,
                        better-capitalized multi-state operators with sophisticated CRM stacks, dynamic
                        pricing engines, and dedicated marketing teams. On the other, a wave of new
                        competition as states license more operators every quarter.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        The single-location owner in Syracuse or Buffalo or White Plains is competing against
                        chains who know exactly what every nearby competitor is charging for a gram of Blue
                        Dream today — and who automatically send a win-back email to any customer who hasn&#39;t
                        been in for 21 days. The independent operator finds out they&#39;ve lost those customers
                        when their Friday revenue is down 12%.
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        BakedBot was founded to close that gap. Not by selling software that operators
                        have to configure, run, and maintain — but by delivering managed AI execution.
                        You get a weekly report. We run everything else.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Our first client, <strong>Thrive Syracuse</strong>, is a social equity dispensary in New York.
                        They&#39;re live on Access Complete: check-in tablet deployed in-store, Alleaves POS
                        integrated, daily competitive tracking across five nearby markets, automated welcome
                        and retention campaigns running. That&#39;s the proof of concept. Now we&#39;re bringing
                        the same system to every independent operator in New York — and then nationally.
                    </p>
                </div>
            </section>

            {/* Founders */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">The team</h2>
                        <p className="text-muted-foreground">
                            Small on purpose. We believe in a lean, agent-augmented team that moves fast and stays close to operators.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {founders.map((f) => (
                            <Card key={f.name} className="border-border/60">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${f.color === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                                            {f.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{f.name}</h3>
                                            <p className="text-sm text-muted-foreground">{f.title}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                <MapPin className="h-3 w-3" />
                                                {f.location}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{f.bio}</p>
                                    <Button asChild variant="outline" size="sm" className="w-full">
                                        <Link href={f.href}>
                                            {f.cta} <ArrowRight className="ml-2 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline */}
            <section className="container mx-auto px-4 py-16 max-w-4xl">
                <h2 className="text-2xl md:text-3xl font-bold mb-10 text-center">How we got here</h2>
                <div className="relative">
                    <div className="absolute left-16 top-0 bottom-0 w-px bg-border hidden sm:block" />
                    <div className="space-y-8">
                        {milestones.map((m) => (
                            <div key={m.year} className="flex gap-6 items-start">
                                <div className="w-12 shrink-0 text-right">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{m.year}</span>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-3 top-1.5 h-2 w-2 rounded-full bg-emerald-500 hidden sm:block" />
                                    <h3 className="font-semibold mb-1">{m.label}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{m.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">What we stand for</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            Six principles that guide every product decision, every campaign, every operator relationship.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {values.map((v) => (
                            <div key={v.title} className="flex gap-3">
                                <div className="mt-0.5 shrink-0">
                                    <v.icon className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">{v.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Proof point */}
            <section className="container mx-auto px-4 py-16 max-w-4xl">
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-8 text-center">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 mb-4">
                            Live proof
                        </Badge>
                        <h2 className="text-xl font-bold mb-3">Thrive Syracuse is our anchor client</h2>
                        <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-6">
                            Thrive Syracuse — a social equity dispensary in New York — is live on Access Complete.
                            Daily competitor tracking across 5+ markets. Alleaves POS integrated. Automated welcome
                            and retention campaigns running. AI budtender active at tablet. Every feature we&#39;ve
                            built is proven in a real dispensary before it ships to you.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">
                                    Get your free audit <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/pricing">See pricing</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
