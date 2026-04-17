'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureAgencyNewsletterSignup } from '@/server/actions/agency-leads';

export default function AgencyNewsletterPopup() {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const dismiss = useCallback(() => {
        setVisible(false);
        setDismissed(true);
        try { sessionStorage.setItem('agency_popup_dismissed', '1'); } catch {}
    }, []);

    useEffect(() => {
        try {
            if (sessionStorage.getItem('agency_popup_dismissed')) return;
        } catch {}

        // Show after 60% scroll depth OR 20 seconds, whichever comes first
        const timer = setTimeout(() => {
            if (!dismissed) setVisible(true);
        }, 20000);

        const onScroll = () => {
            const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
            if (scrolled > 0.6 && !dismissed) {
                setVisible(true);
                window.removeEventListener('scroll', onScroll);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            clearTimeout(timer);
            window.removeEventListener('scroll', onScroll);
        };
    }, [dismissed]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        setError('');

        const result = await captureAgencyNewsletterSignup({ email: email.trim() });
        setLoading(false);

        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error ?? 'Something went wrong.');
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] max-w-[calc(100vw-24px)]">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950 px-5 py-4 relative">
                    <button
                        onClick={dismiss}
                        className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <p className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">Every Monday</p>
                    <h3 className="text-white font-bold text-base leading-tight">Cannabis Marketing Intel Brief</h3>
                    <p className="text-slate-300 text-xs mt-1">BakedBot updates + the week's biggest dispensary marketing news — for agency partners.</p>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    {success ? (
                        <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium">You're in! First issue lands Monday.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@agency.com"
                                    required
                                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>
                            {error && <p className="text-red-600 text-xs">{error}</p>}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get the weekly brief →'}
                            </Button>
                            <button type="button" onClick={dismiss} className="text-xs text-slate-400 hover:text-slate-600 text-center">
                                No thanks
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
