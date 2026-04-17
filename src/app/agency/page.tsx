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
    ChevronRight,
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'BakedBot Agency Partner Program — AI Tools for Cannabis Agencies',
    description:
        'BakedBot partners with marketing agencies, SEO firms, and consultants serving cannabis dispensaries. White-label AI retention, competitive intelligence, and managed campaigns for your dispensary clients.',
    openGraph: {
        title: 'BakedBot Agency Partner Program — AI Tools for Cannabis Agencies',
        description: 'Power your dispensary clients with BakedBot\'s AI platform. Managed retention, competitive intel, and compliance-reviewed campaigns — white-labeled under your agency brand.',
        url: 'https://agency.bakedbot.ai',
        type: 'website',
    },
    alternates: { canonical: 'https://agency.bakedbot.ai' },
};

const LOGO_URL = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';

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
        bio: 'Jeromie Rosa is the founder and CEO of Boosted Maps SEO, one of the leading local SEO agencies serving cannabis dispensaries across the Northeast. His firm specializes in Google Business Profile optimization, local pack rankings, and dispensary-specific SEO strategy that drives foot traffic and online-to-in-store conversion.',
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
        bio: 'POSPosse is a cannabis retail operations consultancy born in Detroit, Michigan — one of the most competitive cannabis markets in the country. Now expanding into New York City, POSPosse specializes in POS system selection, integration, staff training, and dispensary operational efficiency.',
        image: null,
        logo: null,
        website: null,
        specialty: 'POS Selection · Retail Operations · Staff Training · Cannabis Compliance',
        color: 'purple',
    },
];

const steps = [
    { step: '01', title: 'Apply', detail: 'Tell us about your agency and the dispensary clients you serve. We review every application personally.' },
    { step: '02', title: 'Onboard', detail: 'Direct access to Martez and Jack for a 30-minute positioning session. We help you understand where BakedBot fits in your service stack.' },
    { step: '03', title: 'Co-sell', detail: 'We support your first two client pitches with a co-selling call. You own the relationship — we provide the technical proof.' },
    { step: '04', title: 'Earn', detail: 'Revenue share on every client account you bring on. Reported monthly, paid quarterly.' },
];

const stats = [
    { value: '100%', label: 'Compliance reviewed' },
    { value: '24/7', label: 'AI automation' },
    { value: '$925+', label: 'MRR live today' },
    { value: '1', label: 'Active pilot dispensary' },
];

export default function AgencyPage() {
    return (
        <div className="min-h-screen bg-white">

            {/* Nav */}
            <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 max-w-6xl h-16 flex items-center justify-between">
                    <Link href="https://bakedbot.ai" className="flex items-center gap-2">
                        <Image
                            src={LOGO_URL}
                            alt="BakedBot AI"
                            width={120}
                            height={36}
                            className="h-8 w-auto object-contain"
                            unoptimized
                        />
                        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase hidden sm:block">Agency Partners</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="#partners" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">Partners</Link>
                        <Link href="#how-it-works" className="text-sm text-slate-600 hover:text-slate-900 hidden sm:block">How it works</Link>
                        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            <Link href="/book">Apply now <ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
                <div className="container mx-auto px-6 py-24 max-w-6xl">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-8">
                            <Image
                                src={LOGO_URL}
                                alt="BakedBot AI"
                                width={160}
                                height={48}
                                className="h-10 w-auto object-contain brightness-0 invert"
                                unoptimized
                            />
                            <span className="h-6 w-px bg-white/20" />
                            <span className="text-sm font-medium text-emerald-400 tracking-wide uppercase">Agency Partner Program</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                            Power your dispensary clients with AI that runs their retention
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl">
                            BakedBot partners with marketing agencies, SEO firms, and cannabis consultants. Add managed AI retention, competitive intelligence, and compliance-reviewed campaigns to your stack — and earn revenue share on every client you bring on.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8">
                                <Link href="/book">
                                    Apply to become a partner <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="border-slate-500 text-slate-200 bg-transparent hover:bg-white/10 hover:text-white hover:border-slate-400">
                                <Link href="#partners">Meet our launch partners</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats bar */}
            <section className="bg-emerald-600">
                <div className="container mx-auto px-6 max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-emerald-500">
                        {stats.map((s) => (
                            <div key={s.label} className="py-6 px-8 text-center text-white">
                                <div className="text-2xl md:text-3xl font-bold">{s.value}</div>
                                <div className="text-sm text-emerald-100 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Partner benefits */}
            <section className="container mx-auto px-6 py-20 max-w-6xl">
                <div className="mb-12">
                    <Badge className="mb-4 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Partner benefits</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">What you get as a BakedBot agency partner</h2>
                    <p className="text-slate-500 text-lg max-w-xl">Purpose-built for agencies that serve cannabis dispensaries — not a generic reseller program.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {partnerBenefits.map((b) => (
                        <div key={b.title} className="flex gap-4 p-6 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <b.icon className="h-5 w-5 text-emerald-700" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1.5">{b.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{b.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Launch Partners */}
            <section id="partners" className="bg-slate-50 border-y border-slate-200">
                <div className="container mx-auto px-6 py-20 max-w-6xl">
                    <div className="text-center mb-14">
                        <Badge className="mb-4 bg-white border-slate-200 text-slate-600 hover:bg-white">Launch partners</Badge>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">The agencies leading the way</h2>
                        <p className="text-slate-500 max-w-xl mx-auto text-lg">
                            Selected for their deep dispensary expertise and commitment to delivering measurable outcomes for cannabis operators.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {launchPartners.map((p) => (
                            <Card key={p.name} className="border-slate-200 shadow-sm overflow-hidden bg-white">
                                <CardContent className="p-0">
                                    <div className={`p-7 border-b border-slate-100 ${p.color === 'blue' ? 'bg-blue-50/60' : 'bg-purple-50/60'}`}>
                                        <div className="flex items-start gap-5">
                                            {p.image ? (
                                                <div className="h-16 w-16 rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0">
                                                    <Image src={p.image} alt={`${p.name} headshot`} width={64} height={64} className="object-cover w-full h-full" />
                                                </div>
                                            ) : (
                                                <div className={`h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-md ${p.color === 'purple' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                                    {p.company.charAt(0)}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    {p.logo ? (
                                                        <Image src={p.logo} alt={`${p.company} logo`} width={130} height={34} className="h-7 w-auto object-contain" />
                                                    ) : (
                                                        <h3 className="font-bold text-lg text-slate-900">{p.company}</h3>
                                                    )}
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Launch Partner
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700">{p.name} · {p.title}</p>
                                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                                    <MapPin className="h-3 w-3" /> {p.location}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-7">
                                        <p className="text-sm text-slate-600 leading-relaxed mb-5">{p.bio}</p>
                                        <div className="flex flex-wrap gap-1.5 mb-5">
                                            {p.specialty.split(' · ').map((s) => (
                                                <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">{s}</span>
                                            ))}
                                        </div>
                                        {p.website && (
                                            <Button asChild variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                                                <a href={p.website} target="_blank" rel="noopener noreferrer">
                                                    Visit {p.company} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
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
            <section id="how-it-works" className="container mx-auto px-6 py-20 max-w-6xl">
                <div className="text-center mb-14">
                    <Badge className="mb-4 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">Process</Badge>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900">How the partner program works</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((s, i) => (
                        <div key={s.step} className="relative">
                            {i < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-slate-200 z-0" style={{ width: 'calc(100% - 2rem)', left: '3rem' }} />
                            )}
                            <div className="relative z-10">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg mb-5 shadow-lg shadow-emerald-200">{s.step}</div>
                                <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{s.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Who should apply */}
            <section className="bg-slate-50 border-y border-slate-200">
                <div className="container mx-auto px-6 py-16 max-w-6xl">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Who the partner program is for</h2>
                    <div className="grid sm:grid-cols-3 gap-5">
                        {[
                            { title: 'Cannabis SEO agencies', desc: 'You drive traffic. BakedBot converts and retains it. The combination is the complete dispensary growth stack.', icon: '🔍' },
                            { title: 'POS + operations consultants', desc: 'You get operators set up. BakedBot runs the intelligence layer on top of what you installed.', icon: '🖥️' },
                            { title: 'Cannabis marketing agencies', desc: 'You handle campaigns. BakedBot provides the compliance review, segmentation, and attribution your clients need.', icon: '📈' },
                        ].map((item) => (
                            <div key={item.title} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all">
                                <div className="text-3xl mb-3">{item.icon}</div>
                                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white">
                <div className="container mx-auto px-6 py-24 max-w-4xl text-center">
                    <Image src={LOGO_URL} alt="BakedBot AI" width={140} height={42} className="h-10 w-auto object-contain brightness-0 invert mx-auto mb-8" unoptimized />
                    <h2 className="text-3xl md:text-4xl font-bold mb-5">Apply to become a launch partner</h2>
                    <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">
                        We&#39;re accepting a limited number of agency partners in the NY market before expanding nationally. Applications reviewed personally by Martez.
                    </p>
                    <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-10 py-6 text-base">
                        <Link href="/book">
                            Apply now <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                    <p className="text-sm text-slate-400 mt-6">
                        Questions? Email <a href="mailto:martez@bakedbot.ai" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">martez@bakedbot.ai</a>
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-900 text-slate-400">
                <div className="container mx-auto px-6 py-8 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Image src={LOGO_URL} alt="BakedBot AI" width={100} height={30} className="h-6 w-auto object-contain brightness-0 invert opacity-60" unoptimized />
                        <span className="text-xs">© 2026 BakedBot AI</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                        <Link href="https://bakedbot.ai" className="hover:text-white transition-colors">bakedbot.ai</Link>
                        <Link href="/book" className="hover:text-white transition-colors">Apply</Link>
                        <a href="mailto:martez@bakedbot.ai" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
