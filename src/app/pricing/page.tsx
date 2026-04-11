import type { Metadata } from 'next';
import { PricingSection } from '@/components/landing/pricing-section';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { PROMO_CODES } from '@/config/promos';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Pricing | BakedBot AI',
    description:
        'Access plans for proof and adoption. Operator plans for managed customer capture, welcome activation, retention, and weekly reporting.',
    alternates: { canonical: 'https://bakedbot.ai/pricing' },
    openGraph: {
        title: 'Pricing | BakedBot AI',
        description:
            'Access builds trust. Operator builds the company.',
        type: 'website',
        url: 'https://bakedbot.ai/pricing',
    },
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ promo?: string }> }) {
    const { promo } = await searchParams;
    const promoCode = promo?.toUpperCase();
    const activePromo = promoCode && promoCode in PROMO_CODES
        ? PROMO_CODES[promoCode as keyof typeof PROMO_CODES]
        : null;

    return (
        <div className="min-h-screen flex flex-col pt-16">
            <Navbar />

            <main className="flex-1 bg-white">
                {/* Promo Banner */}
                {activePromo && (
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3">
                        <div className="container mx-auto px-4 text-center">
                            <p className="text-sm font-medium">
                                {'bannerText' in activePromo ? activePromo.bannerText : activePromo.description}
                            </p>
                            <p className="text-xs mt-1 opacity-80">
                                Code <strong>{promoCode}</strong> will be applied at signup.
                            </p>
                        </div>
                    </div>
                )}

                {/* Single hero — PricingSection owns the h2, this is the page h1 */}
                <div className="container mx-auto px-4 pt-12 pb-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                        Pricing built around proof and repeat revenue
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Access gives operators a low-friction entry point. Operator gives serious dispensaries a managed revenue activation system with launch support, KPI reviews, and weekly reporting.
                    </p>
                </div>

                <PricingSection />

                {/* CTA Section */}
                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-muted-foreground mb-8">
                            Start with proof if you need it. Book a strategy call if you already know you need accountable execution.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href={`/onboarding?plan=free${promoCode ? `&promo=${promoCode}` : ''}`}
                                className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                            >
                                Start Free Check-In
                            </Link>
                            <Link
                                href="/book/martez"
                                className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-slate-300 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Book Operator Strategy Call
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Enterprise Section */}
                <div className="bg-slate-900 text-white py-24">
                     <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-6 tracking-tight">Enterprise & MSO Plans</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                            Multi-state operators, partner networks, white-label relationships, and governance-heavy rollouts.
                            Enterprise begins as a consultative Operator motion, not a self-serve comparison tier.
                        </p>
                        <Link
                            href="/book/martez"
                            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors"
                        >
                            Book Martez
                        </Link>
                     </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
