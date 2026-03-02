'use client';

import { useState } from 'react';
import { captureNYLead } from '@/server/actions/ny-lead-capture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CheckCircle2,
    BarChart3,
    TrendingDown,
    TrendingUp,
    Eye,
    ShieldCheck,
    MapPin,
} from 'lucide-react';

export default function CompetitiveReportPage() {
    const [email, setEmail] = useState('');
    const [dispensaryName, setDispensaryName] = useState('');
    const [contactName, setContactName] = useState('');
    const [location, setLocation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !dispensaryName.trim()) {
            setError('Email and dispensary name are required');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await captureNYLead({
                email: email.trim(),
                dispensaryName: dispensaryName.trim(),
                contactName: contactName.trim() || undefined,
                location: location.trim() || undefined,
                source: 'competitive-report',
                emailConsent: true,
            });
            if (!result.success) {
                throw new Error(result.error || 'Failed to submit');
            }
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
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium mb-6">
                    <Eye className="w-4 h-4" />
                    Free Competitive Intelligence Report
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-teko uppercase">
                    See What Your Competitors<br />
                    <span className="text-emerald-600">Don&apos;t Want You to Know</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Get a personalized competitive landscape report for your dispensary.
                    We analyze pricing, product mix, and promotions across every competitor in your market.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* What You Get */}
                <div>
                    <h2 className="text-2xl font-bold mb-6">What&apos;s in Your Report</h2>
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <BarChart3 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Category Pricing Analysis</h3>
                                <p className="text-sm text-slate-600">
                                    See exactly where you sit vs. the market on flower, concentrates, edibles, vapes, and pre-rolls.
                                    Know if you&apos;re leaving money on the table or pricing yourself out.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                                <TrendingDown className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Underpriced Opportunities</h3>
                                <p className="text-sm text-slate-600">
                                    Discover categories where you&apos;re leaving margin on the table.
                                    Our AI identifies products you could price higher without losing customers.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Overpriced Risk Zones</h3>
                                <p className="text-sm text-slate-600">
                                    See where competitors are undercutting you. Know which categories
                                    need adjustment before customers walk to the shop down the street.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Local Market Map</h3>
                                <p className="text-sm text-slate-600">
                                    See every dispensary in your radius with their positioning, product focus, and promotional activity.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Social Proof */}
                    <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-600 italic">
                            &ldquo;We discovered we were overpricing concentrates by 76% above market and underpricing flower
                            by 9%. Adjusting those two categories alone added $4K/month in margin.&rdquo;
                        </p>
                        <p className="text-sm font-medium mt-2">
                            — Syracuse dispensary operator
                        </p>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                    {success ? (
                        <div className="flex flex-col items-center py-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Your Report Is on the Way!</h3>
                            <p className="text-slate-600 mb-4">
                                Our AI is pulling competitive data for your market right now.
                                Expect your personalized report within 24 hours.
                            </p>
                            <div className="p-4 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                                <ShieldCheck className="w-4 h-4 inline mr-1" />
                                Check your inbox at <strong>{email}</strong>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold mb-2">Get Your Free Report</h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Takes 30 seconds. We&apos;ll generate your competitive landscape within 24 hours.
                            </p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dispensaryName">Dispensary Name *</Label>
                                    <Input
                                        id="dispensaryName"
                                        placeholder="e.g. Thrive Syracuse"
                                        value={dispensaryName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDispensaryName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">City / Region</Label>
                                    <Input
                                        id="location"
                                        placeholder="e.g. Syracuse, NY"
                                        value={location}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactName">Your Name</Label>
                                    <Input
                                        id="contactName"
                                        placeholder="Your name"
                                        value={contactName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Work Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@dispensary.com"
                                        value={email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500">{error}</p>
                                )}

                                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            Get My Free Report
                                        </>
                                    )}
                                </Button>

                                <p className="text-xs text-center text-slate-400">
                                    Free. No credit card. We&apos;ll email your report and occasional market updates. Unsubscribe anytime.
                                </p>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* How It Works */}
            <div className="mt-20">
                <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                            1
                        </div>
                        <h3 className="font-semibold mb-2">Tell Us Your Dispensary</h3>
                        <p className="text-sm text-slate-600">
                            Enter your dispensary name and location. That&apos;s all we need to start.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                            2
                        </div>
                        <h3 className="font-semibold mb-2">Ezal Scans Your Market</h3>
                        <p className="text-sm text-slate-600">
                            Our competitive intelligence AI analyzes every dispensary in your radius — pricing, products, promotions.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                            3
                        </div>
                        <h3 className="font-semibold mb-2">Get Actionable Insights</h3>
                        <p className="text-sm text-slate-600">
                            Receive a detailed report showing where you&apos;re winning, losing, and where the margin opportunity lives.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
