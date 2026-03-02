'use client';

import { useState } from 'react';
import { captureNYLead } from '@/server/actions/ny-lead-capture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CheckCircle2,
    DollarSign,
    FileText,
    Shield,
    Zap,
    ArrowRight,
    BookOpen,
} from 'lucide-react';

export default function CAURDGrantPage() {
    const [email, setEmail] = useState('');
    const [dispensaryName, setDispensaryName] = useState('');
    const [contactName, setContactName] = useState('');
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
                source: 'caurd-grant',
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
            <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-6 border border-green-200">
                    <DollarSign className="w-4 h-4" />
                    Free Guide for CAURD Licensees
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-teko uppercase">
                    Turn Your $30K OCM Tech Grant<br />
                    <span className="text-emerald-600">Into AI-Powered Growth</span>
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    The CAURD Technology Grant gives equity operators up to $30,000 for POS, compliance, and marketing technology.
                    Here&apos;s exactly how to use it for maximum ROI.
                </p>
            </div>

            <div className="grid lg:grid-cols-5 gap-12">
                {/* Content - 3 columns */}
                <div className="lg:col-span-3">
                    {/* Key Facts */}
                    <div className="grid sm:grid-cols-3 gap-4 mb-10">
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <div className="text-2xl font-bold text-emerald-700">$5M</div>
                            <div className="text-sm text-emerald-600">Total Grant Pool</div>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <div className="text-2xl font-bold text-emerald-700">$30K</div>
                            <div className="text-sm text-emerald-600">Per Dispensary Max</div>
                        </div>
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <div className="text-2xl font-bold text-emerald-700">209</div>
                            <div className="text-sm text-emerald-600">NYC CAURD Operators</div>
                        </div>
                    </div>

                    {/* Guide Content */}
                    <div className="space-y-8">
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold">What the Grant Covers</h2>
                            </div>
                            <div className="pl-11 space-y-3 text-sm text-slate-600">
                                <p>The OCM CAURD Technology Grant (extended through Dec 31, 2026) funds:</p>
                                <ul className="space-y-2">
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600 shrink-0">&#10003;</span>
                                        <span><strong>Point-of-Sale systems</strong> — Hardware + software (Alleaves, Treez, Dutchie)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600 shrink-0">&#10003;</span>
                                        <span><strong>Compliance technology</strong> — Seed-to-sale tracking, regulatory reporting</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600 shrink-0">&#10003;</span>
                                        <span><strong>Marketing automation</strong> — CRM, email/SMS platforms, loyalty programs</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600 shrink-0">&#10003;</span>
                                        <span><strong>Security systems</strong> — Cameras, access control, monitoring</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-emerald-600 shrink-0">&#10003;</span>
                                        <span><strong>AI-powered operations tools</strong> — Analytics, competitive intel, pricing optimization</span>
                                    </li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold">How BakedBot Qualifies</h2>
                            </div>
                            <div className="pl-11 space-y-4 text-sm text-slate-600">
                                <p>
                                    BakedBot AI is a grant-eligible technology platform that combines marketing automation,
                                    compliance monitoring, competitive intelligence, and AI operations into one platform.
                                </p>
                                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                    <div className="font-semibold text-slate-800">Sample Grant Allocation ($30K)</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>BakedBot Empire (12 months)</span>
                                            <span className="font-medium">$11,988</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>POS Integration (Alleaves setup)</span>
                                            <span className="font-medium">$2,000</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Loyalty Program Launch (Alpine IQ)</span>
                                            <span className="font-medium">$5,000</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>SMS/Email Marketing (12 months)</span>
                                            <span className="font-medium">$6,000</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Onboarding + Training</span>
                                            <span className="font-medium">$3,000</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-800">
                                            <span>Total</span>
                                            <span>$27,988</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-purple-600" />
                                </div>
                                <h2 className="text-xl font-bold">Application Checklist</h2>
                            </div>
                            <div className="pl-11 space-y-2 text-sm text-slate-600">
                                {[
                                    'Active CAURD license in good standing',
                                    'NYS business registration (LLC/Corp)',
                                    'OCM-approved retail location',
                                    'Technology vendor quotes (we provide this)',
                                    'Business plan / tech implementation plan (we help write this)',
                                    'Proof of social equity qualification',
                                    'W-9 and banking information',
                                ].map((item, i) => (
                                    <label key={i} className="flex items-start gap-2 cursor-pointer">
                                        <input type="checkbox" className="mt-1 rounded border-slate-300" />
                                        <span>{item}</span>
                                    </label>
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <ArrowRight className="w-4 h-4 text-amber-600" />
                                </div>
                                <h2 className="text-xl font-bold">Next Steps</h2>
                            </div>
                            <div className="pl-11 space-y-3 text-sm text-slate-600">
                                <div className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                                    <span>Download the full playbook with vendor quote templates and application walkthrough</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                                    <span>Schedule a call with our team — we&apos;ll help you write the tech portion of your application</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                                    <span>Submit your OCM application with our vendor quote and implementation plan attached</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Gated Form - 2 columns */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sticky top-24">
                        {success ? (
                            <div className="flex flex-col items-center py-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Playbook on Its Way!</h3>
                                <p className="text-slate-600 mb-4">
                                    Check your inbox for the full CAURD Tech Grant Playbook with
                                    templates, application walkthrough, and vendor quotes.
                                </p>
                                <div className="p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700 w-full">
                                    <BookOpen className="w-4 h-4 inline mr-1" />
                                    Sent to <strong>{email}</strong>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-5 h-5 text-emerald-600" />
                                    <h3 className="text-lg font-bold">Download the Full Playbook</h3>
                                </div>
                                <p className="text-sm text-slate-500 mb-6">
                                    Get the complete guide with application templates, vendor quotes,
                                    and step-by-step instructions.
                                </p>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dispensaryName">Dispensary Name *</Label>
                                        <Input
                                            id="dispensaryName"
                                            placeholder="Your dispensary name"
                                            value={dispensaryName}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDispensaryName(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="contactName">Your Name</Label>
                                        <Input
                                            id="contactName"
                                            placeholder="Full name"
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

                                    {error && <p className="text-sm text-red-500">{error}</p>}

                                    <Button type="submit" className="w-full h-12" disabled={isLoading}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <DollarSign className="w-4 h-4 mr-2" />
                                                Get the Playbook
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-slate-400">
                                        Free download. We&apos;ll also send grant deadline updates. Unsubscribe anytime.
                                    </p>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
