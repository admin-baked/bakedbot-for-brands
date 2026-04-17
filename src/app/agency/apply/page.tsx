import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, MapPin } from 'lucide-react';
import AgencyApplyForm from '@/components/agency/apply-form';

export const metadata: Metadata = {
    title: 'Apply — BakedBot Agency Partner Program',
    description: 'Apply to become a BakedBot agency launch partner. Earn revenue share serving dispensary clients with AI retention, competitive intelligence, and compliance-reviewed campaigns.',
    alternates: { canonical: 'https://agency.bakedbot.ai/apply' },
};

const LOGO_URL = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';

export default function AgencyApplyPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Nav */}
            <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 max-w-5xl h-16 flex items-center justify-between">
                    <Link href="/agency" className="flex items-center gap-2">
                        <Image src={LOGO_URL} alt="BakedBot AI" width={120} height={36} className="h-8 w-auto object-contain" unoptimized />
                    </Link>
                    <Link href="/agency" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="h-4 w-4" /> Back to partner program
                    </Link>
                </div>
            </nav>

            <div className="container mx-auto px-6 max-w-5xl py-16">
                <div className="grid lg:grid-cols-2 gap-16 items-start">

                    {/* Left: context */}
                    <div>
                        <p className="text-emerald-600 text-sm font-bold tracking-widest uppercase mb-3">Launch Partner Application</p>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-5">
                            Apply to become a BakedBot agency partner
                        </h1>
                        <p className="text-slate-500 text-lg leading-relaxed mb-8">
                            Martez reviews every application personally. We're accepting a limited number of agency partners in the NY market before expanding nationally.
                        </p>

                        <div className="space-y-4 mb-10">
                            {[
                                { title: 'Reviewed within 48 hours', desc: 'Personal response from Martez, not an automated sequence.' },
                                { title: '30-min onboarding call', desc: 'We walk you through where BakedBot fits in your service stack.' },
                                { title: 'Co-sell support from day one', desc: 'We join your first two client pitches as technical proof.' },
                                { title: 'Revenue share from the start', desc: 'Earned on every client account you bring on. Paid quarterly.' },
                            ].map(item => (
                                <div key={item.title} className="flex gap-3">
                                    <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                                        <p className="text-slate-500 text-sm">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Social proof */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                                    <Image src="/partners/jeromie-rosa.png" alt="Jeromie Rosa" width={40} height={40} className="object-cover" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="font-semibold text-slate-900 text-sm">Jeromie Rosa</p>
                                        <span className="flex items-center gap-0.5 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Launch Partner
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <MapPin className="h-2.5 w-2.5" /> CEO, Boosted Maps SEO · New York
                                    </div>
                                </div>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed italic">
                                "Pairing local SEO expertise with BakedBot's retention intelligence gives dispensary clients the complete growth stack — traffic in, customers retained."
                            </p>
                        </div>
                    </div>

                    {/* Right: form */}
                    <div>
                        <AgencyApplyForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
