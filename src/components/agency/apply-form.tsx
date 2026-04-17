'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureAgencyPartnerLead } from '@/server/actions/agency-leads';

const SPECIALTIES = [
    { value: 'seo', label: 'Cannabis SEO / Local Search' },
    { value: 'pos_operations', label: 'POS & Retail Operations' },
    { value: 'marketing', label: 'Cannabis Marketing Agency' },
    { value: 'other', label: 'Other' },
] as const;

const CLIENT_COUNTS = ['1–3', '4–10', '11–25', '25+'] as const;

type Specialty = (typeof SPECIALTIES)[number]['value'];

export default function AgencyApplyForm() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        agencyName: '',
        website: '',
        specialty: '' as Specialty | '',
        dispensaryClientCount: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.specialty) { setError('Please select your specialty.'); return; }
        if (!form.dispensaryClientCount) { setError('Please select your client count.'); return; }
        setLoading(true);
        setError('');

        const result = await captureAgencyPartnerLead({
            name: form.name,
            email: form.email,
            agencyName: form.agencyName,
            website: form.website || undefined,
            specialty: form.specialty as Specialty,
            dispensaryClientCount: form.dispensaryClientCount,
        });

        setLoading(false);
        if (result.success) {
            setSubmitted(true);
        } else {
            setError(result.error ?? 'Something went wrong. Please try again.');
        }
    };

    if (submitted) {
        return (
            <div className="bg-white rounded-2xl border border-emerald-200 p-10 text-center shadow-sm max-w-lg mx-auto">
                <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Application received.</h2>
                <p className="text-slate-500 mb-6">
                    Martez reviews every application personally. You'll hear from him within 48 hours. Check your inbox — a welcome email is on its way.
                </p>
                <p className="text-sm text-slate-400">
                    Questions? <a href="mailto:martez@bakedbot.ai" className="text-emerald-600 underline underline-offset-2">martez@bakedbot.ai</a>
                </p>
            </div>
        );
    }

    const inputClass = "w-full px-4 py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white placeholder:text-slate-400";
    const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-lg mx-auto space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
                <div>
                    <label className={labelClass}>Your name *</label>
                    <input type="text" required placeholder="Jeromie Rosa" value={form.name} onChange={set('name')} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Work email *</label>
                    <input type="email" required placeholder="you@agency.com" value={form.email} onChange={set('email')} className={inputClass} />
                </div>
            </div>

            <div>
                <label className={labelClass}>Agency name *</label>
                <input type="text" required placeholder="Boosted Maps SEO" value={form.agencyName} onChange={set('agencyName')} className={inputClass} />
            </div>

            <div>
                <label className={labelClass}>Agency website</label>
                <input type="url" placeholder="https://youragency.com" value={form.website} onChange={set('website')} className={inputClass} />
            </div>

            <div>
                <label className={labelClass}>What does your agency specialize in? *</label>
                <select required value={form.specialty} onChange={set('specialty')} className={inputClass}>
                    <option value="">Select your specialty</option>
                    {SPECIALTIES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className={labelClass}>How many dispensary clients do you serve? *</label>
                <div className="grid grid-cols-4 gap-2">
                    {CLIENT_COUNTS.map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, dispensaryClientCount: c }))}
                            className={`py-2.5 text-sm font-semibold rounded-lg border transition-colors ${
                                form.dispensaryClientCount === c
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-base"
            >
                {loading
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : <>Submit application <ArrowRight className="ml-2 h-4 w-4" /></>
                }
            </Button>

            <p className="text-xs text-center text-slate-400">
                By submitting you agree to receive emails from BakedBot AI. <br />
                Unsubscribe anytime. No spam.
            </p>
        </form>
    );
}
