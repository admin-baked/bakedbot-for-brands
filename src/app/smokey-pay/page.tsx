'use client';

// src/app/smokey-pay/page.tsx
// SmokeyPay standalone marketing page
// Shareable with prospects: bakedbot.ai/smokey-pay

import Link from 'next/link';
import { useState } from 'react';
import {
    ShoppingCart, Smartphone, ShieldCheck, Zap, Store, Globe,
    CheckCircle, ArrowRight, Star, MessageSquare, BarChart3,
    Lock, Leaf, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// ── Data ──────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
    {
        brand: 'Ultra Cannabis',
        location: 'Denver, CO',
        logo: '🌿',
        quote:
            'SmokeyPay turned our brand page into a real revenue channel overnight. ' +
            'Customers love the AI checkout — we saw a 40% lift in online order volume in the first month.',
        author: 'Marcus T.',
        role: 'Co-Founder, Ultra Cannabis',
        stars: 5,
    },
    {
        brand: 'Ecstatic Edibles',
        location: 'Portland, OR',
        logo: '🍬',
        quote:
            'We were skeptical about AI checkout, but Smokey actually recommends the right products. ' +
            'Our average order value went up 22% because Smokey upsells naturally — no pushy sales tactics.',
        author: 'Priya K.',
        role: 'Director of eCommerce, Ecstatic Edibles',
        stars: 5,
    },
    {
        brand: 'Thrive Syracuse',
        location: 'Syracuse, NY',
        logo: '🌱',
        quote:
            'State-compliant cannabis payments without the friction. SmokeyPay handles the compliance layer ' +
            'so we can focus on serving customers.',
        author: 'James R.',
        role: 'General Manager, Thrive',
        stars: 5,
    },
];

const HOW_IT_WORKS = [
    {
        step: '01',
        icon: Globe,
        title: 'Customer finds your menu',
        body: 'On your claimed brand page, embedded menu, or any BakedBot-powered storefront.',
    },
    {
        step: '02',
        icon: MessageSquare,
        title: 'Chat with Smokey AI',
        body: 'Smokey recommends the perfect products, answers questions, and builds the cart — all in plain English.',
    },
    {
        step: '03',
        icon: ShieldCheck,
        title: 'Pay with SmokeyPay',
        body: 'One tap. State-compliant cannabis payment via the CannPay network. Age-verified. No card data stored.',
    },
];

const FOR_MENU_FEATURES = [
    'Embed on any website in 60 seconds',
    'Live inventory sync — never oversell',
    'Real-time product search & filtering',
    'Smokey AI recommendations in every session',
    'SmokeyPay checkout built in',
];

const FOR_CLAIMED_FEATURES = [
    'Your Google-indexed brand page becomes a store',
    'Customers find you organically → buy instantly',
    'Multi-location retailer selection',
    'Full order management dashboard',
    'SMS/email notifications for you and your customers',
];

const COMPLIANCE_BULLETS = [
    'Age verification required at every session',
    'State-specific compliance rules enforced by Deebo AI',
    'CannPay network — licensed cannabis payment processor',
    'No payment card data ever stored on our servers',
    'Full audit trail for every transaction',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SmokeyPayPage() {
    const [activeFaq, setActiveFaq] = useState<number | null>(null);

    const faqs = [
        {
            q: 'What states is SmokeyPay available in?',
            a: 'SmokeyPay is available in all US states with legal adult-use or medical cannabis markets. CannPay handles state-by-state compliance automatically.',
        },
        {
            q: 'How does SmokeyPay handle age verification?',
            a: 'Every session requires customers to verify their age via our age-gate flow before they can view products or initiate checkout. Verification records are stored per-session.',
        },
        {
            q: 'What does "claimed page" mean?',
            a: 'When your dispensary or brand claims their BakedBot brand page, checkout is unlocked automatically. Customers who find you on Google can buy directly — no separate e-commerce build needed.',
        },
        {
            q: 'How quickly can I get started?',
            a: 'Claim your page or embed a menu today. SmokeyPay checkout activates instantly after your CannPay merchant account is connected — typically under 24 hours.',
        },
        {
            q: 'Is there a setup fee?',
            a: 'No setup fee. SmokeyPay is included with BakedBot Standard and above. Transaction fees apply per CannPay\'s standard rate.',
        },
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">

            {/* ── Nav ── */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Leaf className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold text-gray-900">BakedBot</span>
                        <span className="text-gray-400 text-sm">/ SmokeyPay</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:inline">Sign in</Link>
                        <Link href="/get-started">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5">
                                Get SmokeyPay
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 text-white">
                <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0d9488 0%, transparent 50%)' }}
                />
                <div className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32 text-center">
                    <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-medium px-3 py-1">
                        Powered by CannPay Network
                    </Badge>
                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 leading-none">
                        The only checkout<br />
                        <span className="text-emerald-400">built for cannabis.</span>
                    </h1>
                    <p className="text-xl text-emerald-100/80 max-w-2xl mx-auto mb-10 leading-relaxed">
                        SmokeyPay turns your menu pages and brand presence into revenue channels.
                        AI recommendations, state-compliant payments, and instant order fulfillment — all in one.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/get-started">
                            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-full px-8 py-6 text-base">
                                Start accepting SmokeyPay
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/claim">
                            <Button size="lg" variant="outline" className="border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 rounded-full px-8 py-6 text-base">
                                Claim your brand page
                            </Button>
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-emerald-400/60">No setup fee · Live in 24 hours · Cancel anytime</p>
                </div>
            </section>

            {/* ── Social proof logos ── */}
            <section className="border-b border-gray-100 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">Trusted by cannabis brands</p>
                    <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
                        {['Ultra Cannabis', 'Ecstatic Edibles', 'Thrive Syracuse'].map((name) => (
                            <span key={name} className="text-gray-500 font-semibold text-sm tracking-tight">{name}</span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section className="py-24 max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <Badge className="mb-4 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">How it works</Badge>
                    <h2 className="text-4xl font-bold">Browse. Chat. Pay.</h2>
                    <p className="mt-3 text-gray-500 text-lg max-w-xl mx-auto">Three steps from discovery to completed order.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {HOW_IT_WORKS.map(({ step, icon: Icon, title, body }) => (
                        <div key={step} className="relative">
                            <div className="text-7xl font-black text-gray-50 select-none mb-2">{step}</div>
                            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                                <Icon className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{title}</h3>
                            <p className="text-gray-500 leading-relaxed">{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── For Menus ── */}
            <section className="bg-gray-50 py-24">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <Badge className="mb-4 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Store className="h-3 w-3 mr-1" /> For Menus
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">Embed a live menu.<br />Checkout included.</h2>
                        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                            Drop a BakedBot menu on any website in 60 seconds. Your customers get live inventory,
                            Smokey AI recommendations, and SmokeyPay checkout — without leaving your page.
                        </p>
                        <ul className="space-y-3">
                            {FOR_MENU_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-3 text-gray-700">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8">
                            <Link href="/get-started">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">
                                    Embed a menu <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    {/* Demo mockup */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                        <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2">
                            <Leaf className="h-4 w-4 text-white" />
                            <span className="text-white font-semibold text-sm">Ultra Cannabis — Menu</span>
                            <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">Live</Badge>
                        </div>
                        <div className="p-4 space-y-3">
                            {['Blue Dream · $42', 'Mango Kush Gummies · $28', 'Sour Diesel Live Resin · $55'].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-sm">{item.split('·')[0].trim()}</p>
                                        <p className="text-emerald-600 font-bold text-sm">{item.split('·')[1].trim()}</p>
                                    </div>
                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 rounded-full">
                                        <ShoppingCart className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                            ))}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm text-emerald-800 font-medium">SmokeyPay · $125.00</span>
                                <ArrowRight className="h-4 w-4 text-emerald-600 ml-auto" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── For Claimed Pages ── */}
            <section className="py-24">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Demo mockup */}
                    <div className="bg-emerald-950 rounded-2xl overflow-hidden shadow-xl order-2 lg:order-1">
                        <div className="px-4 py-3 border-b border-emerald-800 flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <div className="h-3 w-3 rounded-full bg-yellow-500" />
                            <div className="h-3 w-3 rounded-full bg-green-500" />
                            <span className="ml-2 text-emerald-400 text-xs">bakedbot.ai/ecstatic-edibles</span>
                        </div>
                        <div className="p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center text-2xl">🍬</div>
                                <div>
                                    <p className="font-bold">Ecstatic Edibles</p>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                                        <span className="text-emerald-400 text-xs">Verified · SmokeyPay Ready</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-emerald-900/40 rounded-lg p-3 mb-3 flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-emerald-100">
                                    &quot;Hey! I&apos;m looking for something relaxing for movie night — not too strong.&quot;
                                </p>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3 mb-4 flex items-start gap-2">
                                <Leaf className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-gray-200">
                                    Perfect — I&apos;d suggest our <strong>Couch Cloud Gummies</strong> (5mg THC, $22) or the
                                    <strong> Blueberry Chill Chocolate</strong> (10mg, $18). Both are great for evenings. Want me to add them?
                                </p>
                            </div>
                            <Button className="w-full bg-emerald-500 hover:bg-emerald-400 text-white rounded-full text-sm">
                                <ShoppingCart className="h-4 w-4 mr-2" /> Checkout 2 items · $40.00
                            </Button>
                        </div>
                    </div>
                    <div className="order-1 lg:order-2">
                        <Badge className="mb-4 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Globe className="h-3 w-3 mr-1" /> For Claimed Pages
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">Your brand page becomes<br />a revenue channel.</h2>
                        <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                            Claim your BakedBot brand page and checkout is unlocked instantly.
                            Customers who find you organically can buy without leaving — no separate e-commerce build needed.
                        </p>
                        <ul className="space-y-3">
                            {FOR_CLAIMED_FEATURES.map((f) => (
                                <li key={f} className="flex items-center gap-3 text-gray-700">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8">
                            <Link href="/claim">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">
                                    Claim your page <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Compliance ── */}
            <section className="bg-emerald-950 text-white py-24">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <Badge className="mb-4 text-xs bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            <Lock className="h-3 w-3 mr-1" /> Compliance & Security
                        </Badge>
                        <h2 className="text-4xl font-bold mb-4">Built for cannabis compliance.<br />Not bolted on.</h2>
                        <p className="text-emerald-200/70 text-lg mb-8 leading-relaxed">
                            Every SmokeyPay transaction is compliant by design. Deebo AI enforces state-specific rules
                            at checkout — so you never have to think about it.
                        </p>
                        <ul className="space-y-4">
                            {COMPLIANCE_BULLETS.map((b) => (
                                <li key={b} className="flex items-center gap-3 text-emerald-100">
                                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                                    {b}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: ShieldCheck, label: 'State Compliant', sub: 'All legal markets' },
                            { icon: Lock, label: 'PCI Safe', sub: 'No stored card data' },
                            { icon: Zap, label: 'Instant Approval', sub: 'Under 24 hours' },
                            { icon: BarChart3, label: 'Full Analytics', sub: 'Every transaction' },
                        ].map(({ icon: Icon, label, sub }) => (
                            <Card key={label} className="bg-emerald-900/50 border-emerald-800">
                                <CardContent className="p-5">
                                    <Icon className="h-7 w-7 text-emerald-400 mb-3" />
                                    <p className="font-bold text-white">{label}</p>
                                    <p className="text-emerald-400 text-sm">{sub}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <Badge className="mb-4 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Customer stories</Badge>
                        <h2 className="text-4xl font-bold">Cannabis brands growing with SmokeyPay</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {TESTIMONIALS.map(({ brand, location, logo, quote, author, role, stars }) => (
                            <Card key={brand} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-1 mb-4">
                                        {Array.from({ length: stars }).map((_, i) => (
                                            <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-gray-700 leading-relaxed mb-6 text-sm">&ldquo;{quote}&rdquo;</p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl">{logo}</div>
                                        <div>
                                            <p className="font-semibold text-sm">{author}</p>
                                            <p className="text-gray-500 text-xs">{role}</p>
                                            <p className="text-emerald-600 text-xs">{brand} · {location}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="py-24 max-w-3xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold">Common questions</h2>
                </div>
                <div className="space-y-3">
                    {faqs.map(({ q, a }, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                            >
                                <span className="font-semibold text-sm pr-4">{q}</span>
                                <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                            </button>
                            {activeFaq === i && (
                                <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{a}</div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-24">
                <div className="max-w-3xl mx-auto px-4 text-center">
                    <h2 className="text-5xl font-bold mb-4">Ready to accept SmokeyPay?</h2>
                    <p className="text-emerald-100 text-xl mb-10 leading-relaxed">
                        Join Ultra Cannabis, Ecstatic Edibles, and hundreds of dispensaries
                        turning discovery into revenue with SmokeyPay.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/get-started">
                            <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold rounded-full px-8 py-6 text-base">
                                Get started free
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link href="/claim">
                            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-full px-8 py-6 text-base">
                                Claim your brand page
                            </Button>
                        </Link>
                    </div>
                    <p className="mt-6 text-emerald-200/60 text-sm">No setup fee · Live in 24 hours · Cancel anytime</p>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-gray-100 py-10">
                <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-emerald-500" />
                        <span>© 2026 BakedBot AI · SmokeyPay</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy-policy" className="hover:text-gray-600">Privacy</Link>
                        <Link href="/terms" className="hover:text-gray-600">Terms</Link>
                        <Link href="/get-started" className="hover:text-gray-600">Get Started</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
