'use client';

/**
 * Loyalty Tablet Page
 *
 * Full-screen touch-optimized flow for in-store loyalty signup.
 * Designed for iPad at the dispensary counter.
 * Auto-resets after 20s idle. 4 steps: Welcome → Phone → Email+Consent → Success.
 *
 * Usage: Navigate to /loyalty-tablet?orgId=org_thrive_syracuse
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { captureTabletLead } from '@/server/actions/loyalty-tablet';
import { CheckCircle2, Gift, Phone, Mail, ArrowRight, Loader2, Star } from 'lucide-react';

type Step = 'welcome' | 'phone' | 'email' | 'success';

const IDLE_TIMEOUT_MS = 20_000; // 20 seconds idle → reset to welcome

export default function LoyaltyTabletPage() {
    const params = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams();
    const orgId = params.get('orgId') || 'org_thrive_syracuse';

    const [step, setStep] = useState<Step>('welcome');
    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [emailConsent, setEmailConsent] = useState(true);
    const [smsConsent, setSmsConsent] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ isNewLead: boolean; loyaltyPoints: number } | null>(null);
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetToWelcome = useCallback(() => {
        setStep('welcome');
        setFirstName('');
        setPhone('');
        setEmail('');
        setEmailConsent(true);
        setSmsConsent(true);
        setError('');
        setResult(null);
        setLoading(false);
    }, []);

    // Idle timeout — reset after 20 seconds of inactivity
    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (step !== 'welcome') {
            idleTimer.current = setTimeout(resetToWelcome, IDLE_TIMEOUT_MS);
        }
    }, [step, resetToWelcome]);

    useEffect(() => {
        resetIdleTimer();
        return () => {
            if (idleTimer.current) clearTimeout(idleTimer.current);
        };
    }, [step, resetIdleTimer]);

    const handlePhoneSubmit = () => {
        resetIdleTimer();
        setError('');
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setStep('email');
    };

    const handleSubmit = async () => {
        resetIdleTimer();
        setError('');
        setLoading(true);
        try {
            const res = await captureTabletLead({
                orgId,
                firstName,
                email: email || undefined,
                phone: phone || undefined,
                emailConsent,
                smsConsent,
            });
            if (res.success) {
                setResult({ isNewLead: res.isNewLead ?? true, loyaltyPoints: res.loyaltyPoints || 0 });
                setStep('success');
                // Auto-reset after 12 seconds on success screen
                setTimeout(resetToWelcome, 12_000);
            } else {
                setError(res.error || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    };

    const slideVariants = {
        enter: { x: 60, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -60, opacity: 0 },
    };

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center p-8 select-none"
            onTouchStart={resetIdleTimer}
            onClick={resetIdleTimer}
        >
            {/* BakedBot branding */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
                <span className="text-2xl font-black tracking-tight text-purple-400">BakedBot</span>
            </div>

            <AnimatePresence mode="wait">
                {step === 'welcome' && (
                    <motion.div
                        key="welcome"
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-8 max-w-lg text-center"
                    >
                        <div className="text-8xl">🍃</div>
                        <div>
                            <h1 className="text-5xl font-black text-white mb-3">Join Thrive Loyalty</h1>
                            <p className="text-xl text-purple-300">Earn points on every purchase.<br />Redeem for free cannabis & discounts.</p>
                        </div>
                        <div className="flex gap-6 text-center">
                            {[
                                { icon: '🎁', label: 'Welcome Offer', sub: '10% off first order' },
                                { icon: '⭐', label: 'Earn Points', sub: '1 point per $1 spent' },
                                { icon: '🔓', label: 'VIP Perks', sub: 'Exclusive member deals' },
                            ].map(item => (
                                <div key={item.label} className="bg-white/10 rounded-2xl p-4 flex-1">
                                    <div className="text-3xl mb-1">{item.icon}</div>
                                    <div className="text-sm font-bold text-white">{item.label}</div>
                                    <div className="text-xs text-purple-300 mt-1">{item.sub}</div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setStep('phone')}
                            className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-2xl font-bold py-6 px-12 rounded-2xl shadow-lg shadow-purple-900/50 flex items-center justify-center gap-3 transition-colors"
                        >
                            Sign Me Up <ArrowRight className="h-7 w-7" />
                        </button>
                        <p className="text-sm text-white/40">Tap anywhere to start</p>
                    </motion.div>
                )}

                {step === 'phone' && (
                    <motion.div
                        key="phone"
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <Phone className="h-14 w-14 text-purple-400 mx-auto mb-4" />
                            <h2 className="text-4xl font-black text-white">What&apos;s your name & number?</h2>
                            <p className="text-lg text-white/60 mt-2">We&apos;ll text you exclusive deals</p>
                        </div>

                        <div className="w-full space-y-4">
                            <input
                                type="text"
                                placeholder="First name"
                                value={firstName}
                                onChange={e => { setFirstName(e.target.value); resetIdleTimer(); }}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 text-2xl py-5 px-6 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30"
                                autoComplete="given-name"
                            />
                            <input
                                type="tel"
                                placeholder="(555) 000-0000"
                                value={phone}
                                onChange={e => { setPhone(formatPhone(e.target.value)); resetIdleTimer(); }}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 text-2xl py-5 px-6 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30"
                                inputMode="tel"
                                autoComplete="tel"
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <button
                            onClick={handlePhoneSubmit}
                            disabled={!firstName.trim() || phone.replace(/\D/g, '').length < 10}
                            className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white text-2xl font-bold py-6 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                        >
                            Continue <ArrowRight className="h-7 w-7" />
                        </button>
                        <button onClick={resetToWelcome} className="text-white/40 hover:text-white/60 text-sm">← Back</button>
                    </motion.div>
                )}

                {step === 'email' && (
                    <motion.div
                        key="email"
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <Mail className="h-14 w-14 text-purple-400 mx-auto mb-4" />
                            <h2 className="text-4xl font-black text-white">Add your email?</h2>
                            <p className="text-lg text-white/60 mt-2">Optional — get monthly deals & updates</p>
                        </div>

                        <div className="w-full space-y-4">
                            <input
                                type="email"
                                placeholder="you@example.com (optional)"
                                value={email}
                                onChange={e => { setEmail(e.target.value); resetIdleTimer(); }}
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 text-2xl py-5 px-6 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30"
                                inputMode="email"
                                autoComplete="email"
                            />

                            {/* Consent checkboxes */}
                            <div className="space-y-3">
                                {[
                                    { checked: smsConsent, onChange: setSmsConsent, label: 'Yes, text me deals & updates' },
                                    { checked: emailConsent, onChange: setEmailConsent, label: 'Yes, email me monthly newsletter' },
                                ].map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => { item.onChange(!item.checked); resetIdleTimer(); }}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                            item.checked ? 'border-purple-500 bg-purple-500/20' : 'border-white/20 bg-white/5'
                                        }`}
                                    >
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            item.checked ? 'border-purple-400 bg-purple-400' : 'border-white/40'
                                        }`}>
                                            {item.checked && <CheckCircle2 className="h-5 w-5 text-white" />}
                                        </div>
                                        <span className="text-lg text-white text-left">{item.label}</span>
                                    </button>
                                ))}
                            </div>

                            <p className="text-xs text-white/30 text-center px-4">
                                You can opt out anytime. We never share your data. Msg & data rates may apply.
                            </p>
                        </div>

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-60 text-white text-2xl font-bold py-6 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                        >
                            {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <>Join Loyalty <Gift className="h-7 w-7" /></>}
                        </button>
                        <button onClick={() => setStep('phone')} className="text-white/40 hover:text-white/60 text-sm">← Back</button>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.35, type: 'spring' }}
                        className="flex flex-col items-center gap-8 max-w-lg text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                        >
                            <CheckCircle2 className="h-28 w-28 text-green-400" />
                        </motion.div>

                        <div>
                            <h1 className="text-5xl font-black text-white mb-3">
                                Welcome{firstName ? `, ${firstName}` : ''}! 🎉
                            </h1>
                            <p className="text-xl text-purple-300">
                                {result?.isNewLead
                                    ? "You're officially part of the Thrive family."
                                    : "Good to see you again! Your loyalty is noted."}
                            </p>
                        </div>

                        {result && result.loyaltyPoints > 0 && (
                            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl px-8 py-5 flex items-center gap-4">
                                <Star className="h-10 w-10 text-yellow-400" />
                                <div className="text-left">
                                    <div className="text-3xl font-black text-yellow-300">{result.loyaltyPoints} pts</div>
                                    <div className="text-sm text-yellow-400/80">Your current loyalty balance</div>
                                </div>
                            </div>
                        )}

                        <p className="text-white/50 text-sm">This screen will reset in a few seconds...</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
