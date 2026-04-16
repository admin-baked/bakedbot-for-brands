import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Mail, MessageSquare, ShieldCheck, BarChart3, Clock, RefreshCw } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dispensary Marketing Automation — AI Campaigns for Cannabis Retailers | BakedBot',
    description:
        'BakedBot automates dispensary marketing campaigns: welcome sequences, win-back flows, and retention campaigns that comply with cannabis advertising rules. Managed for you. Live at Thrive Syracuse, NY.',
    openGraph: {
        title: 'Dispensary Marketing Automation — AI Campaigns for Cannabis Retailers',
        description: 'Cannabis-compliant marketing automation for dispensaries. Welcome flows, win-back campaigns, and lifecycle sequences managed by AI. Proven at Thrive Syracuse.',
        url: 'https://bakedbot.ai/dispensary-marketing-automation',
    },
    alternates: { canonical: 'https://bakedbot.ai/dispensary-marketing-automation' },
};

const automations = [
    { icon: Mail, title: 'Welcome playbook', description: 'New customers receive a personalized welcome sequence that introduces your dispensary, highlights your menu, and captures product preferences — automatically on first visit.' },
    { icon: RefreshCw, title: 'Win-back campaigns', description: 'When a customer hasn\'t visited in 21, 45, or 90 days, an automated win-back campaign triggers with a relevant offer — before you\'ve even noticed they\'re gone.' },
    { icon: MessageSquare, title: 'SMS + email coordination', description: 'Multi-channel campaigns that respect customer preferences. SMS for urgency, email for detail. Both cannabis-compliant.' },
    { icon: ShieldCheck, title: 'Compliance review on every send', description: 'Deebo, our compliance agent, reviews every campaign against OCM guidelines before it sends. No guessing about what\'s allowed.' },
    { icon: BarChart3, title: 'Revenue attribution', description: 'Every campaign is tied back to real transactions. You see exactly which automation generated how much revenue in your weekly report.' },
    { icon: Clock, title: 'Set-and-forget lifecycle flows', description: 'Birthday campaigns, seasonal promotions, and loyalty milestones run on schedule without anyone remembering to hit send.' },
];

const sequence = [
    { step: '1', title: 'Day 0', detail: 'Customer checks in at tablet. Data captured. Welcome sequence triggers.' },
    { step: '2', title: 'Day 1', detail: 'Welcome email: menu highlights, product preferences survey, loyalty intro.' },
    { step: '3', title: 'Day 7', detail: 'Follow-up based on purchase: "You tried Blue Dream last time — here\'s what\'s new in your category."' },
    { step: '4', title: 'Day 21', detail: 'If no return visit: win-back message with time-sensitive offer.' },
    { step: '5', title: 'Day 45', detail: 'Second win-back with different angle — new product drop or competitive comparison.' },
    { step: '6', title: 'Ongoing', detail: 'Loyalty milestone campaigns, birthday offers, seasonal promotions — all automated.' },
];

export default function DispensaryMarketingAutomationPage() {
    return (
        <div className="min-h-screen bg-background">
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Marketing automation
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            Dispensary marketing automation that&#39;s actually compliant
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            BakedBot automates your dispensary&#39;s entire marketing lifecycle — from first visit to loyal repeat customer — using AI campaigns that are reviewed for cannabis compliance before every send. You get the results without running the campaigns yourself.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/ai-retention-audit">Get your free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="/book">Talk to a founder</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Proof */}
            <section className="container mx-auto px-4 py-10 max-w-5xl">
                <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="p-5">
                        <p className="text-sm font-semibold text-emerald-800 mb-1">Live at Thrive Syracuse, NY</p>
                        <p className="text-sm text-muted-foreground">Automated welcome playbook, win-back campaigns, and loyalty flows running daily. Alleaves POS integrated so every campaign is triggered by real transaction data — not guesses.</p>
                    </CardContent>
                </Card>
            </section>

            {/* Automations */}
            <section className="container mx-auto px-4 py-12 max-w-5xl">
                <h2 className="text-2xl font-bold mb-8">What gets automated</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {automations.map((a) => (
                        <div key={a.title} className="flex gap-3">
                            <a.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{a.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sequence */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-8 text-center">The default lifecycle sequence</h2>
                    <div className="space-y-4">
                        {sequence.map((s) => (
                            <div key={s.step} className="flex gap-4 items-start">
                                <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shrink-0">{s.step}</div>
                                <div className="pt-1">
                                    <span className="font-semibold text-sm">{s.title}: </span>
                                    <span className="text-sm text-muted-foreground">{s.detail}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Start with a free audit of your current retention</h2>
                <p className="text-muted-foreground mb-8">We benchmark your retention rate against comparable NY dispensaries and show you exactly what revenue you&#39;re leaving behind. No sales pressure — just numbers.</p>
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/ai-retention-audit">Get your free audit <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">30-day money-back guarantee on all paid plans. <Link href="/pricing" className="underline">See pricing →</Link></p>
            </section>
        </div>
    );
}
