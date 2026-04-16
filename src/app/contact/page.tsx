'use client';

import type { Metadata } from 'next';
import { useState } from 'react';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { BookingCta } from '@/components/cta/booking-cta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2 } from 'lucide-react';

// Note: metadata export cannot coexist with 'use client' — move to layout if needed.
// export const metadata: Metadata = { ... }

type InquiryType = 'dispensary' | 'brand' | 'partnership' | 'other';

const INQUIRY_OPTIONS: { value: InquiryType; label: string }[] = [
    { value: 'dispensary', label: 'I own / operate a dispensary' },
    { value: 'brand', label: 'I represent a cannabis brand' },
    { value: 'partnership', label: 'Partnership inquiry' },
    { value: 'other', label: 'Something else' },
];

export default function ContactPage() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        dispensaryName: '',
        state: '',
        city: '',
        message: '',
        inquiryType: 'dispensary' as InquiryType,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    function update(field: string, value: string) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Submission failed');
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Email us at sales@bakedbot.ai');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col pt-16 bg-background text-foreground">
            <Navbar />

            <main className="flex-1 mx-auto max-w-2xl px-4 py-16 w-full">

                {/* Header */}
                <div className="mb-10">
                    <Badge variant="outline" className="mb-3 text-emerald-600 border-emerald-200 bg-emerald-50">
                        Now accepting NY dispensaries
                    </Badge>
                    <h1 className="text-4xl font-bold tracking-tight">Let&apos;s talk.</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        BakedBot is live with dispensaries across New York. If you want to see how your store stacks up against competitors — or explore our Founding Partner program — reach out below.
                    </p>
                </div>

                {/* Social proof strip */}
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-6 py-4 mb-10 text-sm text-emerald-900 space-y-1">
                    <p><strong>Already live:</strong> Thrive Syracuse, NY</p>
                    <p><strong>Founding Partner offer:</strong> 50% off for 60 days + direct engineering access</p>
                    <p><strong>NY dispensaries:</strong> CAURD tech grant eligible — up to $30K toward your platform</p>
                </div>

                {/* Contact Form */}
                {success ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 flex flex-col items-center text-center gap-4">
                        <CheckCircle className="h-12 w-12 text-emerald-600" />
                        <h2 className="text-xl font-semibold">Got it — you&apos;ll hear from us within 24 hours.</h2>
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Martez reviews every inbound personally. For urgent inquiries, book a call directly below.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Inquiry type */}
                        <div className="space-y-2">
                            <Label>I&apos;m reaching out because…</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {INQUIRY_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => update('inquiryType', opt.value)}
                                        className={`rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                                            form.inquiryType === opt.value
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                                                : 'border-border hover:bg-muted/50'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name + Email */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Your name *</Label>
                                <Input
                                    id="name"
                                    required
                                    placeholder="First Last"
                                    value={form.name}
                                    onChange={e => update('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="you@dispensary.com"
                                    value={form.email}
                                    onChange={e => update('email', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Dispensary details (shown for dispensary type) */}
                        {form.inquiryType === 'dispensary' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="dispensaryName">Dispensary name</Label>
                                    <Input
                                        id="dispensaryName"
                                        placeholder="e.g. Green Horizon Dispensary"
                                        value={form.dispensaryName}
                                        onChange={e => update('dispensaryName', e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            placeholder="e.g. Buffalo"
                                            value={form.city}
                                            onChange={e => update('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            placeholder="e.g. NY"
                                            maxLength={2}
                                            value={form.state}
                                            onChange={e => update('state', e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Message */}
                        <div className="space-y-1.5">
                            <Label htmlFor="message">
                                {form.inquiryType === 'dispensary'
                                    ? 'What are you trying to solve? (optional)'
                                    : 'Message (optional)'}
                            </Label>
                            <Textarea
                                id="message"
                                rows={4}
                                placeholder={
                                    form.inquiryType === 'dispensary'
                                        ? "e.g. We want to understand our competitive position, improve customer retention, automate marketing…"
                                        : "Tell us more…"
                                }
                                value={form.message}
                                onChange={e => update('message', e.target.value)}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Sending…' : 'Send Message'}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Martez reviews every submission personally. Response within 24 hours.
                        </p>
                    </form>
                )}

                {/* Divider */}
                <div className="my-12 flex items-center gap-4">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm text-muted-foreground">or reach us directly</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                {/* Direct contacts */}
                <div className="grid gap-4 sm:grid-cols-2 mb-10">
                    <div className="rounded-2xl border border-border p-5">
                        <h3 className="font-semibold text-sm">Sales & Demos</h3>
                        <p className="mt-1 text-sm text-muted-foreground">New dispensaries and brands.</p>
                        <a
                            href="mailto:sales@bakedbot.ai"
                            className="mt-3 inline-block text-sm font-medium text-emerald-600 hover:underline"
                        >
                            sales@bakedbot.ai
                        </a>
                    </div>
                    <div className="rounded-2xl border border-border p-5">
                        <h3 className="font-semibold text-sm">Support</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Existing customers — technical help.</p>
                        <a
                            href="mailto:support@bakedbot.ai"
                            className="mt-3 inline-block text-sm font-medium text-emerald-600 hover:underline"
                        >
                            support@bakedbot.ai
                        </a>
                    </div>
                </div>

                {/* Book a call CTA */}
                <BookingCta
                    variant="banner"
                    headline="Skip the form — book a 30-min demo"
                    subtext="See BakedBot running live against your city's competitive landscape. No pitch deck, no fluff — just your data."
                />

            </main>

            <LandingFooter />
        </div>
    );
}
