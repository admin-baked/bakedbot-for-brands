import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowRight,
    CheckCircle2,
    Users,
    BarChart3,
    TrendingUp,
    ShieldCheck,
    Zap,
    MapPin,
    Star,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot Agency Partner Program — AI Tools for Cannabis Agencies',
    description:
        'BakedBot partners with marketing agencies, SEO firms, and consultants serving cannabis dispensaries. White-label AI retention, competitive intelligence, and managed campaigns for your dispensary clients. Apply to become a launch partner.',
    openGraph: {
        title: 'BakedBot Agency Partner Program — AI Tools for Cannabis Agencies',
        description: 'Power your dispensary clients with BakedBot\'s AI platform. Managed retention, competitive intel, and compliance-reviewed campaigns — white-labeled under your agency brand. Launch partners: Boosted Maps SEO and POSPosse.',
        url: 'https://agency.bakedbot.ai',
        type: 'website',
    },
    alternates: { canonical: 'https://agency.bakedbot.ai' },
};

const partnerBenefits = [
    { icon: Zap, title: 'AI execution under your brand', description: 'Deliver BakedBot\'s managed retention, competitive intelligence, and campaign automation as part of your agency\'s service stack — white-labeled or co-branded.' },
    { icon: BarChart3, title: 'Weekly reporting you can share', description: 'Every client gets a branded weekly KPI report showing retention revenue, competitive positioning, and campaign performance. Plug it into your client reviews.' },
    { icon: ShieldCheck, title: 'Compliance built in', description: 'Every campaign goes through BakedBot\'s compliance agent before send. You deliver cannabis-compliant marketing without a compliance team on staff.' },
    { icon: Users, title: 'Dedicated partner support', description: 'Launch partners get direct access to Martez and Jack for onboarding, positioning, and deal support. You\'re not alone in the first 90 days.' },
    { icon: TrendingUp, title: 'Revenue share model', description: 'Partners earn revenue share on every client account they bring on. The more clients you serve with BakedBot, the more you earn.' },
    { icon: CheckCircle2, title: 'Proven at Thrive Syracuse', description: 'The platform you\'re reselling is live in a real dispensary today. You\'re not selling a demo — you\'re selling a system that\'s already working.' },
];

const launchPartners = [
    {
        name: 'Jeromie Rosa',
        company: 'Boosted Maps SEO',
        title: 'CEO',
        location: 'New York',
        bio: 'Jeromie Rosa is the founder and CEO of Boosted Maps SEO, one of the leading local SEO agencies serving cannabis dispensaries across the Northeast. His firm specializes in Google Business Profile optimization, local pack rankings, and dispensary-specific SEO strategy that drives foot traffic and online-to-in-store conversion. Jeromie was among the first to recognize BakedBot\'s potential as the intelligence layer behind a complete dispensary growth stack — pairing his local visibility expertise with BakedBot\'s retention and competitive intelligence capabilities.',
        image: '/partners/jeromie-rosa.png',
        logo: '/partners/boosted-maps.png',
        website: 'https://boostedmaps.com',
        specialty: 'Local SEO · Google Business Profile · Dispensary Visibility',
        color: 'blue',
    },
    {
        name: 'POSPosse',
        company: 'POSPosse',
        title: 'Cannabis POS & Retail Operations Consultants',
        location: 'Detroit, MI · New York City',
        bio: 'POSPosse is a cannabis retail operations consultancy born in Detroit, Michigan — one of the most competitive cannabis markets in the country. Now expanding into New York City, POSPosse specializes in POS system selection, integration, staff training, and dispensary operational efficiency. As a BakedBot launch partner, POSPosse brings the retail operations expertise that ensures the data flowing from POS to BakedBot is clean, consistent, and ready to power retention campaigns from day one.',
        image: null,
        logo: null,
        website: null,
        specialty: 'POS Selection · Retail Operations · Staff Training · Cannabis Compliance',
        color: 'purple',
    },
];

const steps = [
    { step: '1', title: 'Apply', detail: 'Tell us about your agency and the dispensary clients you serve. We review every application personally.' },
    { step: '2', title: 'Onboard', detail: 'Direct access to Martez and Jack for a 30-minute positioning session. We help you understand where BakedBot fits in your service stack.' },
    { step: '3', title: 'Co-sell', detail: 'We support your first two client pitches with a co-selling call. You own the relationship — we provide the technical proof.' },
    { step: '4', title: 'Earn', detail: 'Revenue share on every client account you bring on. Reported monthly, paid quarterly.' },
];

export default function AgencyPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero */}
            <section className="border-b border-border/40 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
                <div className="container mx-auto px-4 py-20 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20">
                            Agency Partner Program
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                            Power your dispensary clients with AI that runs their retention
                        </h1>
                        <p className="text-xl text-slate-300 leading-relaxed mb-8">
                            BakedBot partners with marketing agencies, SEO firms, and cannabis consultants who serve dispensary operators. Add managed AI retention, competitive intelligence, and compliance-reviewed campaigns to your service stack — and earn revenue share on every client you bring on.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                <Link href="/book">
                                    Apply to become a partner <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                                <Link href="#partners">Meet our launch partners</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Partner benefits */}
            <section className="container mx-auto px-4 py-16 max-w-5xl">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">What you get as a BakedBot agency partner</h2>
                <p className="text-muted-foreground mb-10">Purpose-built for agencies that serve cannabis dispensaries — not a generic reseller program.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {partnerBenefits.map((b) => (
                        <div key={b.title} className="flex gap-3">
                            <b.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold mb-1">{b.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Launch Partners */}
            <section id="partners" className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-16 max-w-5xl">
                    <div className="text-center mb-12">
                        <Badge variant="outline" className="mb-4">Launch partners</Badge>
                        <h2 className="text-2xl md:text-3xl font-bold mb-3">The agencies leading the way</h2>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            Our launch partners were selected for their deep dispensary expertise and their commitment to delivering real, measurable outcomes for cannabis operators.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {launchPartners.map((p) => (
                            <Card key={p.name} className="border-border/60 overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Partner header */}
                                    <div className={`p-6 ${p.color === 'blue' ? 'bg-blue-50' : 'bg-purple-50'} border-b border-border/40`}>
                                        <div className="flex items-start gap-4">
                                            {p.image ? (
                                                <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                                    <Image
                                                        src={p.image}
                                                        alt={`${p.name} headshot`}
                                                        width={64}
                                                        height={64}
                                                        className="object-cover w-full h-full"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0 ${p.color === 'purple' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                                    {p.company.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {p.logo && (
                                                        <Image
                                                            src={p.logo}
                                                            alt={`${p.company} logo`}
                                                            width={120}
                                                            height={32}
                                                            className="h-7 w-auto object-contain"
                                                        />
                                                    )}
                                                    {!p.logo && (
                                                        <h3 className="font-bold text-lg">{p.company}</h3>
                                                    )}
                                                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                                    <span className="text-xs font-medium text-muted-foreground">Launch Partner</span>
                                                </div>
                                                <p className="text-sm font-medium mt-1">{p.name} · {p.title}</p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {p.location}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Partner body */}
                                    <div className="p-6">
                                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{p.bio}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {p.specialty.split(' · ').map((s) => (
                                                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                                            ))}
                                        </div>
                                        {p.website && (
                                            <Button asChild variant="outline" size="sm">
                                                <a href={p.website} target="_blank" rel="noopener noreferrer">
                                                    Visit {p.company} <ArrowRight className="ml-1 h-3 w-3" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="container mx-auto px-4 py-16 max-w-4xl">
                <h2 className="text-2xl font-bold mb-10 text-center">How the partner program works</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((s) => (
                        <div key={s.step} className="text-center">
                            <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3">{s.step}</div>
                            <h3 className="font-semibold mb-1">{s.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">{s.detail}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Who should apply */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-12 max-w-4xl">
                    <h2 className="text-xl font-bold mb-6 text-center">Who the partner program is for</h2>
                    <div className="grid sm:grid-cols-3 gap-4 text-center">
                        {[
                            { title: 'Cannabis SEO agencies', desc: 'You drive traffic. BakedBot converts and retains it. The combination is the complete growth stack.' },
                            { title: 'POS + operations consultants', desc: 'You get operators set up. BakedBot runs the intelligence layer on top of what you installed.' },
                            { title: 'Cannabis marketing agencies', desc: 'You handle campaigns. BakedBot provides the compliance review, segmentation, and attribution your clients need.' },
                        ].map((item) => (
                            <Card key={item.title} className="border-border/60">
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-sm mb-2">{item.title}</h3>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="container mx-auto px-4 py-16 max-w-3xl text-center">
                <h2 className="text-2xl font-bold mb-4">Apply to become a launch partner</h2>
                <p className="text-muted-foreground mb-8">
                    We&#39;re accepting a limited number of agency partners in the NY market before expanding nationally. Applications reviewed personally by Martez.
                </p>
                <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/book">
                        Apply now <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                    Questions? Email <a href="mailto:martez@bakedbot.ai" className="underline">martez@bakedbot.ai</a>
                </p>
            </section>
        </div>
    );
}
