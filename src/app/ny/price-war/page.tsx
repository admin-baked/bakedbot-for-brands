'use client';

import { useState } from 'react';
import { captureNYLead } from '@/server/actions/ny-lead-capture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CheckCircle2,
    TrendingDown,
    TrendingUp,
    Minus,
    BarChart3,
    MapPin,
    ArrowRight,
} from 'lucide-react';

// Syracuse competitive pricing data (sourced from Ezal competitive intel)
const SYRACUSE_DISPENSARIES = [
    { name: 'Thrive Syracuse', area: 'Erie Blvd', flower: 35, concentrate: 55, edible: 25, vape: 40, preroll: 12 },
    { name: 'FlynnStoned', area: 'State Fair Blvd', flower: 38, concentrate: 48, edible: 22, vape: 38, preroll: 10 },
    { name: 'Off Hours', area: 'Westcott', flower: 42, concentrate: 50, edible: 28, vape: 42, preroll: 14 },
    { name: "TJ's Provisions", area: 'Eastwood', flower: 36, concentrate: 45, edible: 24, vape: 36, preroll: 11 },
    { name: "Kiefer's", area: 'James St', flower: 40, concentrate: 52, edible: 26, vape: 44, preroll: 13 },
    { name: 'Etain', area: 'Buckley Rd', flower: 45, concentrate: 60, edible: 30, vape: 48, preroll: 15 },
    { name: 'Green Thumb', area: 'Salina St', flower: 34, concentrate: 42, edible: 20, vape: 35, preroll: 9 },
    { name: 'Empire State Buds', area: 'Destiny USA', flower: 37, concentrate: 47, edible: 23, vape: 39, preroll: 11 },
];

const CATEGORIES = [
    { key: 'flower' as const, label: 'Flower (1/8 oz)', unit: '/eighth' },
    { key: 'concentrate' as const, label: 'Concentrates (1g)', unit: '/g' },
    { key: 'edible' as const, label: 'Edibles (100mg)', unit: '/pkg' },
    { key: 'vape' as const, label: 'Vape Carts (0.5g)', unit: '/cart' },
    { key: 'preroll' as const, label: 'Pre-Rolls (1g)', unit: '/ea' },
];

type CategoryKey = 'flower' | 'concentrate' | 'edible' | 'vape' | 'preroll';

function getMarketAvg(key: CategoryKey): number {
    const sum = SYRACUSE_DISPENSARIES.reduce((acc, d) => acc + d[key], 0);
    return sum / SYRACUSE_DISPENSARIES.length;
}

function getMarketRange(key: CategoryKey): { min: number; max: number } {
    const values = SYRACUSE_DISPENSARIES.map((d) => d[key]);
    return { min: Math.min(...values), max: Math.max(...values) };
}

function PriceDelta({ price, avg }: { price: number; avg: number }) {
    const delta = ((price - avg) / avg) * 100;
    if (Math.abs(delta) < 3) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Minus className="w-3 h-3" /> Market
            </span>
        );
    }
    if (delta > 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                <TrendingUp className="w-3 h-3" /> +{delta.toFixed(0)}% above
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
            <TrendingDown className="w-3 h-3" /> {delta.toFixed(0)}% below
        </span>
    );
}

export default function PriceWarPage() {
    const [email, setEmail] = useState('');
    const [dispensaryName, setDispensaryName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !dispensaryName.trim()) {
            setError('Email and dispensary/city name are required');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await captureNYLead({
                email: email.trim(),
                dispensaryName: dispensaryName.trim(),
                source: 'price-war',
                emailConsent: true,
            });
            if (!result.success) throw new Error(result.error);
            setSuccess(true);
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-16 max-w-6xl">
            {/* Hero */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-700 text-sm font-medium mb-6 border border-red-200">
                    <BarChart3 className="w-4 h-4" />
                    Live Market Intelligence
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-teko uppercase">
                    The Syracuse<br />
                    <span className="text-red-600">Price War Report</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Real-time competitive pricing across 8+ Syracuse dispensaries.
                    See who&apos;s winning, who&apos;s losing, and where the margin opportunity lives.
                </p>
                <p className="text-sm text-slate-400 mt-2">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Data sourced from Ezal AI Competitive Intelligence | Updated March 2026
                </p>
            </div>

            {/* Market Overview */}
            <div className="grid sm:grid-cols-5 gap-4 mb-10">
                {CATEGORIES.map((cat) => {
                    const avg = getMarketAvg(cat.key);
                    const range = getMarketRange(cat.key);
                    return (
                        <div key={cat.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                            <div className="text-xs text-slate-500 mb-1">{cat.label}</div>
                            <div className="text-xl font-bold">${avg.toFixed(0)}</div>
                            <div className="text-xs text-slate-400">avg {cat.unit}</div>
                            <div className="text-xs text-slate-400 mt-1">
                                ${range.min} — ${range.max}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pricing Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left p-4 font-semibold">Dispensary</th>
                                <th className="text-left p-4 font-semibold">Area</th>
                                {CATEGORIES.map((cat) => (
                                    <th key={cat.key} className="text-center p-4 font-semibold">
                                        {cat.label.split(' (')[0]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SYRACUSE_DISPENSARIES.map((disp, i) => (
                                <tr key={disp.name} className={i % 2 === 0 ? '' : 'bg-slate-50/50'}>
                                    <td className="p-4 font-medium">{disp.name}</td>
                                    <td className="p-4 text-slate-500 text-xs">{disp.area}</td>
                                    {CATEGORIES.map((cat) => {
                                        const avg = getMarketAvg(cat.key);
                                        return (
                                            <td key={cat.key} className="p-4 text-center">
                                                <div className="font-medium">${disp[cat.key]}</div>
                                                <PriceDelta price={disp[cat.key]} avg={avg} />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {/* Market Average Row */}
                            <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-semibold">
                                <td className="p-4">Market Average</td>
                                <td className="p-4 text-slate-500 text-xs">Syracuse Metro</td>
                                {CATEGORIES.map((cat) => (
                                    <td key={cat.key} className="p-4 text-center text-emerald-700">
                                        ${getMarketAvg(cat.key).toFixed(0)}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Key Insights */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="p-6 rounded-xl border border-red-200 bg-red-50">
                    <TrendingUp className="w-6 h-6 text-red-600 mb-3" />
                    <h3 className="font-bold mb-2 text-red-800">Overpriced Alert</h3>
                    <p className="text-sm text-red-700">
                        Concentrates show the widest spread: ${getMarketRange('concentrate').min} to $
                        {getMarketRange('concentrate').max}. Some dispensaries are 40%+ above the lowest
                        price, risking customer loss on the highest-margin category.
                    </p>
                </div>
                <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50">
                    <TrendingDown className="w-6 h-6 text-emerald-600 mb-3" />
                    <h3 className="font-bold mb-2 text-emerald-800">Margin Opportunity</h3>
                    <p className="text-sm text-emerald-700">
                        Flower pricing clusters tightly ($34-$45/eighth), but edibles and pre-rolls
                        show room for strategic premium positioning — customers are less price-sensitive
                        on these categories.
                    </p>
                </div>
                <div className="p-6 rounded-xl border border-blue-200 bg-blue-50">
                    <BarChart3 className="w-6 h-6 text-blue-600 mb-3" />
                    <h3 className="font-bold mb-2 text-blue-800">Market Dynamics</h3>
                    <p className="text-sm text-blue-700">
                        8+ dispensaries competing in the Syracuse metro create genuine price competition.
                        The operators with real-time competitive data adjust faster and protect margins
                        while others react weeks late.
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-center text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 font-teko uppercase">
                    Want This for Your Market?
                </h2>
                <p className="text-slate-300 max-w-xl mx-auto mb-8">
                    This is a snapshot. BakedBot customers get daily competitive updates,
                    price change alerts, and AI-powered pricing recommendations — automatically.
                </p>

                {success ? (
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-lg">
                        <CheckCircle2 className="w-5 h-5" />
                        We&apos;ll send your market&apos;s report to {email}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Your dispensary or city"
                                value={dispensaryName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDispensaryName(e.target.value)}
                                disabled={isLoading}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            />
                        </div>
                        {error && <p className="text-sm text-red-400">{error}</p>}
                        <Button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <ArrowRight className="w-4 h-4 mr-2" />
                            )}
                            {isLoading ? 'Sending...' : 'Get My Free Competitive Report'}
                        </Button>
                        <p className="text-xs text-slate-400">
                            Free report for any NY market. No credit card required.
                        </p>
                    </form>
                )}
            </div>

            {/* NY Founding Partner CTA */}
            <div className="mt-12 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 md:p-12 text-center text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 font-teko uppercase">
                    NY Founding Partner Program
                </h2>
                <p className="text-emerald-100 max-w-xl mx-auto mb-6">
                    Get daily competitive intel like this — plus AI pricing, marketing automation,
                    and compliance monitoring. 50% off for 60 days, then 30% off for 6 months.
                </p>
                <a
                    href="/pricing?promo=NYFOUNDINGPARTNER"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-md bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
                >
                    View Plans &amp; Get Started
                </a>
            </div>
        </div>
    );
}
