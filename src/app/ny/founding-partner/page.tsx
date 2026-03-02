import { getFoundingPartnerSpotsRemaining } from '@/server/actions/ny-lead-capture';
import { FoundingPartnerForm } from './form';

export const metadata = {
    title: 'NY Founding Partner Program | BakedBot AI',
    description: 'Join 10 select New York dispensaries as a BakedBot AI founding partner. 50% off for 60 days, 30% off for 6 months, plus direct product roadmap input.',
};

export default async function FoundingPartnerPage() {
    const spotsRemaining = await getFoundingPartnerSpotsRemaining();

    return (
        <div className="container mx-auto px-4 py-16 max-w-6xl">
            {/* Hero */}
            <div className="text-center mb-16">
                {spotsRemaining > 0 ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-6 border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        {spotsRemaining} of 10 Founding Partner Spots Remaining
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium mb-6">
                        All Founding Partner spots have been claimed
                    </div>
                )}
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-teko uppercase">
                    Become a BakedBot AI<br />
                    <span className="text-emerald-600">NY Founding Partner</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    We&apos;re selecting 10 New York dispensaries as founding partners.
                    Get preferred pricing, direct product input, and be first to market with AI-powered operations.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Benefits */}
                <div>
                    {/* Pricing Timeline */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold mb-6">Founding Partner Pricing</h2>
                        <div className="relative">
                            <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-emerald-200" />
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-sm font-bold z-10">
                                        1
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Days 1-60: 50% Off</h3>
                                        <p className="text-sm text-slate-600">
                                            Full access to the Operations Intelligence Suite at half price.
                                            Growth tier at $174.50/mo. Zero risk pilot period.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 text-sm font-bold z-10">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Months 3-8: 30% Off</h3>
                                        <p className="text-sm text-slate-600">
                                            Founding partner rate locked in for 6 months.
                                            Growth tier at $244.30/mo. Empire at $699.30/mo.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-400 text-white flex items-center justify-center shrink-0 text-sm font-bold z-10">
                                        3
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Month 9+: Standard Pricing</h3>
                                        <p className="text-sm text-slate-600">
                                            By then, the ROI speaks for itself. Most partners upgrade to Empire.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* What You Get */}
                    <h2 className="text-xl font-bold mb-4">What Founding Partners Get</h2>
                    <ul className="space-y-3 mb-8">
                        {[
                            'Daily competitive intelligence reports (Ezal AI)',
                            'Dynamic pricing recommendations (Money Mike)',
                            'AI budtender for your sales floor (Smokey)',
                            'On-demand compliant creative (Craig)',
                            'Profitability analysis by category & SKU (Pops)',
                            'Direct product roadmap input — shape what we build next',
                            'Priority support from our founding team',
                            'Featured case study on BakedBot.ai',
                        ].map((item) => (
                            <li key={item} className="flex gap-2 items-start text-sm">
                                <span className="text-emerald-600 shrink-0 mt-0.5 font-bold">&#10003;</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    {/* What We Ask */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="font-semibold mb-2">What We Ask in Return</h3>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li>&#8226; Participate in a brief case study after 90 days</li>
                            <li>&#8226; Provide a testimonial if you&apos;re seeing results</li>
                            <li>&#8226; Share feedback to help us improve the platform</li>
                        </ul>
                    </div>
                </div>

                {/* Form */}
                <FoundingPartnerForm spotsRemaining={spotsRemaining} />
            </div>

            {/* Pricing CTA */}
            <div className="mt-20 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 md:p-12 text-center text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 font-teko uppercase">
                    Ready to Lock In Your Rate?
                </h2>
                <p className="text-emerald-100 max-w-xl mx-auto mb-6">
                    View all plans and start with 50% off for your first 60 days.
                    Code NYFOUNDINGPARTNER is automatically applied.
                </p>
                <a
                    href="/pricing?promo=NYFOUNDINGPARTNER"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                >
                    View Plans &amp; Pricing
                </a>
            </div>

            {/* Ideal Partner */}
            <div className="mt-20 text-center">
                <h2 className="text-2xl font-bold mb-8">Who We&apos;re Looking For</h2>
                <div className="grid md:grid-cols-4 gap-6">
                    {[
                        {
                            title: 'Alleaves/BioTrack Users',
                            desc: 'Already on NY\'s traceability system. Plug-and-play integration from day one.',
                        },
                        {
                            title: 'CAURD / Equity Operators',
                            desc: 'Social equity licensees with OCM tech grants available (up to $30K).',
                        },
                        {
                            title: 'Multi-Location',
                            desc: 'Operating 2+ locations. Higher volume = bigger ROI from our intelligence tools.',
                        },
                        {
                            title: 'Growth-Minded',
                            desc: 'Operators investing in operations, not just surviving. Ready to use data to win.',
                        },
                    ].map((item) => (
                        <div key={item.title} className="p-5 rounded-xl border border-slate-200 text-left">
                            <h3 className="font-semibold mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-600">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
