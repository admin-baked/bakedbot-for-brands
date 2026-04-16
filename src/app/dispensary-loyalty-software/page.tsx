import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Star, RefreshCw, Users, ShieldCheck, BarChart3, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dispensary Loyalty Software — Beyond Points: AI-Driven Retention | BakedBot',
    description:
        'BakedBot replaces broken dispensary loyalty programs with an AI retention system that actually brings customers back. No points to redeem — just automated campaigns tied to real behavior. Proven at Thrive Syracuse.',
    openGraph: {
        title: 'Dispensary Loyalty Software — Beyond Points: AI-Driven Retention',
        description: 'Most dispensary loyalty programs have <15% active use. BakedBot replaces them with AI-driven retention that tracks behavior, triggers campaigns, and proves revenue impact.',
        url: 'https://bakedbot.ai/dispensary-loyalty-software',
    },
    alternates: { canonical: 'https://bakedbot.ai/dispensary-loyalty-software' },
};

const problems = [
    'Fewer than 15% of loyalty members are active in any given month',
    'Customers forget they have points — and forget your dispensary',
    'Points programs require staff to explain and customers to opt in',
    'No attribution — you can\'t tell which campaigns actually drove a visit',
    'Generic templates that don\'t speak to what each customer actually buys',
];

const difference = [
    { icon: Users, title: 'Behavior-triggered, not points-triggered', description: 'Campaigns fire based on what a customer actually did: visited, bought a specific product, hit a frequency milestone. No points to track.' },
    { icon: RefreshCw, title: 'Automatic re-engagement', description: 'When a customer misses their usual visit window, a win-back campaign fires automatically — with a message tailored to their product history.' },
    { icon: Star, title: 'Managed Welcome Playbook', description: 'Every new customer enters a structured welcome sequence: day 1, day 7, day 21. Personalized by purchase behavior, not a generic "thanks for visiting."' },
    { icon: BarChart3, title: 'Revenue attribution built in', description: 'Every campaign is tied back to real transactions. You see which automation generated how much revenue — not just "opens" and "clicks."' },
    { icon: ShieldCheck, title: 'Compliance reviewed before every send', description: 'Deebo reviews every customer message against OCM guidelines before it sends. Cannabis-specific compliance built in.' },
    { icon: CheckCircle2, title: '30-day money-back guarantee', description: 'If you don\'t see measurable lift in the first 30 days, you get your money back. We put our fee on the line.' },
];

export default function DispensaryLoyaltySoftwarePage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Loyalty &amp; retention
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            Your loyalty program isn&#39;t working. Here&#39;s what does.
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Most dispensary loyalty programs have fewer than 15% active users. BakedBot replaces the points-and-redemption model with an AI retention system that tracks behavior, triggers personalized campaigns automatically, and reports real revenue impact every week.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get a free retention audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Talk to a founder</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problems with current loyalty */}
            <section className="border-b border-border/40 bg-muted/30">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <h2 className="text-lg font-bold mb-5 text-center">Why most dispensary loyalty programs fail</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {problems.map((p) => (
                            <div key={p} className="flex gap-2 items-start text-sm text-muted-foreground">
                                <span className="text-red-400 mt-0.5">✕</span>
                                <span>{p}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* The difference */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl font-bold mb-3">How BakedBot is different</h2>
                <p className="text-muted-foreground mb-10">We don&#39;t replace your POS — we layer managed AI execution on top of it. Every campaign is behavior-driven, compliance-reviewed, and tied back to revenue.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {difference.map((d) => (
                        <div key={d.title} className="flex gap-3">
                            <d.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{d.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
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
                            <p className="font-semibold text-emerald-800 mb-2">Thrive Syracuse — live proof</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">Social equity dispensary in New York. Access Complete plan. Check-in tablet deployed, Alleaves POS integrated, automated welcome playbook and win-back campaigns running. Full attribution in the weekly report — no guessing which campaign drove what.</p>
                            <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700" size="sm">
                                <Link href="/pricing">See plans and pricing <ArrowRight className="ml-1 h-3 w-3" /></Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Audit your current retention rate — free</h2>
                <p className="text-muted-foreground mb-8">We compare your retention against comparable dispensaries in your market and show you the gap. Takes 10 minutes. No commitment.</p>
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/ai-retention-audit">Get your free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">30-day money-back guarantee. <Link href="/pricing" className="underline">See pricing →</Link></p>
            </section>
        </div>
    );
}
