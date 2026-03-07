import { PricingSection } from '@/components/landing/pricing-section';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { PROMO_CODES } from '@/config/promos';
import Link from 'next/link';

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

                <div className="container mx-auto px-4 py-12 text-center">
                    <h1 className="text-4xl font-bold font-teko uppercase text-primary mb-4">
                        Hire Your Digital Workforce
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
                        Start with a free Scout to audit your market, or deploy a full executive team to dominate it.
                    </p>
                </div>

                <PricingSection />

                {/* Get Started Section */}
                <div className="container mx-auto px-4 py-16">
                    <div className="max-w-2xl mx-auto text-center">
                        <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-muted-foreground mb-8">
                            Start free with Scout — no credit card required. Upgrade anytime.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href={`/get-started?plan=scout${promoCode ? `&promo=${promoCode}` : ''}`}
                                className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
                            >
                                Start Free (Scout)
                            </Link>
                            <Link
                                href={`/get-started?plan=pro${promoCode ? `&promo=${promoCode}` : ''}`}
                                className="inline-flex items-center justify-center h-12 px-8 rounded-md border border-slate-300 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Start Pro — $99/mo
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Enterprise Section */}
                <div className="bg-slate-900 text-white py-24 mt-12">
                     <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-6 font-teko uppercase tracking-wide">Ready for the $10M Path?</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto mb-8">
                            For MSOs and brands processing over $5M/yr, our Agency Partner program provides custom infrastructure, dedicated strategy, and white-labeled agents.
                        </p>
                        <a href="mailto:sales@bakedbot.ai" className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100 transition-colors">
                            Contact Enterprise Sales
                        </a>
                     </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
