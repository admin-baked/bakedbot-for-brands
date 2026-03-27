'use client';

/**
 * Loyalty Tablet Page
 *
 * Full-screen touch-optimized flow for in-store check-in at Thrive Syracuse.
 * Designed for iPad at the dispensary counter.
 * Auto-resets after 20s idle.
 *
 * Steps:
 *   welcome → phone → email → mood → recommendations → success
 *
 * Usage: Navigate to /loyalty-tablet?orgId=org_thrive_syracuse
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    captureTabletLead,
    getMoodRecommendations,
} from '@/server/actions/loyalty-tablet';
import {
    TABLET_MOODS,
    getTabletMoodById,
    type TabletMoodId,
    type TabletProduct,
    type TabletBundle,
} from '@/lib/checkin/loyalty-tablet-shared';
import {
    CheckCircle2, Phone, Mail, ArrowRight, Loader2, Star,
    ShoppingCart, Users, ChevronRight,
} from 'lucide-react';

type Step = 'welcome' | 'phone' | 'email' | 'mood' | 'recommendations' | 'success';

const IDLE_TIMEOUT_MS = 20_000;
const STEPS = ['phone', 'email', 'mood', 'recommendations'] as const;

export default function LoyaltyTabletPage() {
    const [orgId] = useState<string>(() => {
        if (typeof window === 'undefined') return 'org_thrive_syracuse';
        return new URLSearchParams(window.location.search).get('orgId') || 'org_thrive_syracuse';
    });

    // Form state
    const [step, setStep] = useState<Step>('welcome');
    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [emailConsent, setEmailConsent] = useState(false);
    const [smsConsent, setSmsConsent] = useState(false);

    // Mood + recs state
    const [selectedMood, setSelectedMood] = useState<TabletMoodId | null>(null);
    const [recsLoading, setRecsLoading] = useState(false);
    const [products, setProducts] = useState<TabletProduct[]>([]);
    const [bundle, setBundle] = useState<TabletBundle | null>(null);
    const [cart, setCart] = useState<string[]>([]); // productIds added to cart
    const [bundleAdded, setBundleAdded] = useState(false);

    // Submit state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ isNewLead: boolean; loyaltyPoints: number } | null>(null);

    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetToWelcome = useCallback(() => {
        setStep('welcome');
        setFirstName('');
        setPhone('');
        setEmail('');
        setEmailConsent(false);
        setSmsConsent(false);
        setSelectedMood(null);
        setProducts([]);
        setBundle(null);
        setCart([]);
        setBundleAdded(false);
        setError('');
        setResult(null);
        setLoading(false);
        setRecsLoading(false);
    }, []);

    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (step !== 'welcome') {
            idleTimer.current = setTimeout(resetToWelcome, IDLE_TIMEOUT_MS);
        }
    }, [step, resetToWelcome]);

    useEffect(() => {
        resetIdleTimer();
        return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    }, [step, resetIdleTimer]);

    // ── Step handlers ────────────────────────────────────────

    const handlePhoneSubmit = () => {
        resetIdleTimer();
        setError('');
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setStep('email');
    };

    const handleEmailSubmit = () => {
        resetIdleTimer();
        setError('');
        setStep('mood');
    };

    const handleMoodSelect = async (moodId: TabletMoodId) => {
        if (recsLoading || step === 'recommendations') return; // guard against double-tap
        resetIdleTimer();
        setSelectedMood(moodId);
        setRecsLoading(true);
        setStep('recommendations');

        const result = await getMoodRecommendations(orgId, moodId);
        setRecsLoading(false);

        if (result.success && result.products) {
            setProducts(result.products);
            setBundle(result.bundle ?? null);
        } else {
            setError('Could not load recommendations — your budtender can help!');
        }
    };

    const toggleCart = (productId: string) => {
        resetIdleTimer();
        setCart(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
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
                mood: selectedMood ?? undefined,
                cartProductIds: [...new Set([...cart, ...(bundleAdded && bundle ? bundle.products.map(p => p.productId) : [])])],
                bundleAdded,
            });
            if (res.success) {
                setResult({ isNewLead: res.isNewLead ?? true, loyaltyPoints: res.loyaltyPoints || 0 });
                setStep('success');
                setTimeout(resetToWelcome, 14_000);
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

    const selectedMoodDef = getTabletMoodById(selectedMood);
    const cartCount = cart.length + (bundleAdded ? (bundle?.products.length ?? 0) : 0);

    // ── Render ────────────────────────────────────────────────

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center p-8 select-none"
            onTouchStart={resetIdleTimer}
            onClick={resetIdleTimer}
        >
            {/* Header */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <span className="text-2xl font-black tracking-tight text-purple-400">Thrive Syracuse</span>
                {cartCount > 0 && step === 'recommendations' && (
                    <div className="bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <ShoppingCart className="h-4 w-4" />
                        {cartCount}
                    </div>
                )}
            </div>

            {/* Step progress dots */}
            {step !== 'welcome' && step !== 'success' && (
                <div className="absolute top-6 right-8 flex gap-2">
                    {STEPS.map((s, si) => (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full transition-colors ${
                                s === step ? 'bg-purple-400' :
                                si < STEPS.indexOf(step as typeof STEPS[number]) ? 'bg-purple-600' : 'bg-white/20'
                            }`}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence mode="wait">

                {/* ── WELCOME ── */}
                {step === 'welcome' && (
                    <motion.div
                        key="welcome"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-8 max-w-lg text-center"
                    >
                        <div className="text-8xl">🍃</div>
                        <div>
                            <h1 className="text-5xl font-black text-white mb-3">Welcome to Thrive!</h1>
                            <p className="text-xl text-purple-300">Check in to earn loyalty points<br />and get personalized recommendations.</p>
                        </div>
                        <div className="flex gap-4 text-center w-full">
                            {[
                                { icon: '🎯', label: 'Smokey Recommends', sub: 'Picks just for you' },
                                { icon: '⭐', label: 'Earn Points', sub: '1 point per $1 spent' },
                                { icon: '🎁', label: 'Weekly Deals', sub: 'Members-only offers' },
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
                            Check In <ArrowRight className="h-7 w-7" />
                        </button>
                        <p className="text-sm text-white/40">Tap to begin</p>
                    </motion.div>
                )}

                {/* ── PHONE ── */}
                {step === 'phone' && (
                    <motion.div
                        key="phone"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
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

                {/* ── EMAIL ── */}
                {step === 'email' && (
                    <motion.div
                        key="email"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <Mail className="h-14 w-14 text-purple-400 mx-auto mb-4" />
                            <h2 className="text-4xl font-black text-white">Add your email?</h2>
                            <p className="text-lg text-white/60 mt-2">Get weekly deals, bundles & education</p>
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
                            <div className="space-y-3">
                                {[
                                    { checked: smsConsent, onChange: setSmsConsent, label: 'Yes, text me deals & updates' },
                                    { checked: emailConsent, onChange: setEmailConsent, label: 'Yes, email me weekly newsletter' },
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
                        <button
                            onClick={handleEmailSubmit}
                            className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-2xl font-bold py-6 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                        >
                            Continue <ArrowRight className="h-7 w-7" />
                        </button>
                        <button onClick={() => setStep('phone')} className="text-white/40 hover:text-white/60 text-sm">← Back</button>
                    </motion.div>
                )}

                {/* ── MOOD ── */}
                {step === 'mood' && (
                    <motion.div
                        key="mood"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-8 w-full max-w-2xl"
                    >
                        <div className="text-center">
                            <h2 className="text-4xl font-black text-white">
                                How are you feeling today{firstName ? `, ${firstName}` : ''}?
                            </h2>
                            <p className="text-lg text-purple-300 mt-2">
                                Smokey will recommend the perfect products for your vibe
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            {TABLET_MOODS.map(mood => (
                                <button
                                    key={mood.id}
                                    onClick={() => handleMoodSelect(mood.id)}
                                    className="bg-white/10 hover:bg-purple-500/30 active:bg-purple-500/50 border border-white/20 hover:border-purple-400 rounded-2xl p-5 flex items-center gap-4 transition-all text-left"
                                >
                                    <span className="text-4xl">{mood.emoji}</span>
                                    <span className="text-xl font-bold text-white">{mood.label}</span>
                                </button>
                            ))}
                            </div>

                        <button
                            onClick={() => handleSubmit()}
                            disabled={loading}
                            className="text-white/40 hover:text-white/60 disabled:opacity-40 text-sm"
                        >
                            {loading ? 'Saving...' : 'Skip for now'}
                        </button>
                        <button onClick={() => setStep('email')} className="text-white/40 hover:text-white/60 text-sm">← Back</button>
                    </motion.div>
                )}

                {/* ── RECOMMENDATIONS ── */}
                {step === 'recommendations' && (
                    <motion.div
                        key="recommendations"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center gap-6 w-full max-w-2xl"
                    >
                        {recsLoading ? (
                            <div className="flex flex-col items-center gap-6 py-12">
                                <Loader2 className="h-16 w-16 text-purple-400 animate-spin" />
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-white">
                                        Smokey is finding your perfect match...
                                    </p>
                                    <p className="text-purple-300 mt-2">
                                        {selectedMoodDef?.emoji} {selectedMoodDef?.label}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-center">
                                    <p className="text-xl text-purple-300">
                                        {selectedMoodDef?.emoji} Smokey Recommends for <span className="text-white font-bold">{selectedMoodDef?.label}</span>
                                    </p>
                                </div>

                                {/* Individual products */}
                                <div className="w-full space-y-3">
                                    {products.map(product => {
                                        const inCart = cart.includes(product.productId);
                                        return (
                                            <div
                                                key={product.productId}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                                                    inCart
                                                        ? 'border-green-400 bg-green-500/10'
                                                        : 'border-white/20 bg-white/5'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-lg font-bold text-white truncate">{product.name}</p>
                                                    <p className="text-sm text-purple-300 truncate">
                                                        {product.category}{product.brandName ? ` · ${product.brandName}` : ''}
                                                    </p>
                                                    <p className="text-xs text-white/50 mt-1 line-clamp-1">{product.reason}</p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-xl font-black text-white">${product.price.toFixed(2)}</p>
                                                    <button
                                                        onClick={() => toggleCart(product.productId)}
                                                        className={`mt-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                                                            inCart
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-purple-600 hover:bg-purple-500 text-white'
                                                        }`}
                                                    >
                                                        {inCart ? '✓ Added' : '+ Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Bundle */}
                                {bundle && (
                                    <div className={`w-full p-5 rounded-2xl border-2 transition-all ${
                                        bundleAdded
                                            ? 'border-yellow-400 bg-yellow-500/10'
                                            : 'border-yellow-400/40 bg-yellow-500/5'
                                    }`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Star className="h-5 w-5 text-yellow-400" />
                                                    <span className="text-yellow-300 text-sm font-bold uppercase tracking-wide">Bundle Pick</span>
                                                </div>
                                                <p className="text-xl font-black text-white">{bundle.name}</p>
                                                <p className="text-sm text-yellow-300/80 italic mb-2">{bundle.tagline}</p>
                                                <div className="space-y-1">
                                                    {bundle.products.map(p => (
                                                        <p key={p.productId} className="text-sm text-white/70">
                                                            <ChevronRight className="h-3 w-3 inline text-yellow-400" /> {p.name}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-2xl font-black text-yellow-300">${bundle.totalPrice.toFixed(2)}</p>
                                                <button
                                                    onClick={() => { setBundleAdded(!bundleAdded); resetIdleTimer(); }}
                                                    className={`mt-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                                                        bundleAdded
                                                            ? 'bg-yellow-500 text-black'
                                                            : 'bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-200 border border-yellow-400/50'
                                                    }`}
                                                >
                                                    {bundleAdded ? '✓ Added' : '+ Add Bundle'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CTA row */}
                                <div className="w-full flex gap-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-60 text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <>
                                                {cartCount > 0
                                                    ? <><ShoppingCart className="h-6 w-6" /> Continue with {cartCount} item{cartCount !== 1 ? 's' : ''}</>
                                                    : <><Users className="h-6 w-6" /> Continue to Budtender</>
                                                }
                                            </>
                                        )}
                                    </button>
                                </div>

                                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                                <button onClick={() => setStep('mood')} className="text-white/40 hover:text-white/60 text-sm">← Change feeling</button>
                            </>
                        )}
                    </motion.div>
                )}

                {/* ── SUCCESS ── */}
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
                                {result?.isNewLead
                                    ? `You're checked in, ${firstName || 'friend'}!`
                                    : `Welcome back, ${firstName || 'friend'}!`}
                            </h1>
                            <p className="text-xl text-purple-300">
                                {result?.isNewLead
                                    ? 'Your Thrive follow-ups are set if you opted in.'
                                    : 'Your check-in is recorded and your loyalty balance is ready.'}
                            </p>
                        </div>

                        {result && result.loyaltyPoints > 0 && (
                            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-2xl px-8 py-5 flex items-center gap-4">
                                <Star className="h-10 w-10 text-yellow-400" />
                                <div className="text-left">
                                    <div className="text-3xl font-black text-yellow-300">{result.loyaltyPoints} pts</div>
                                    <div className="text-sm text-yellow-400/80">Your loyalty balance</div>
                                </div>
                            </div>
                        )}

                        {cartCount > 0 && (
                            <div className="bg-green-500/20 border border-green-400/30 rounded-2xl px-8 py-4 flex items-center gap-3">
                                <ShoppingCart className="h-8 w-8 text-green-400" />
                                <p className="text-green-300 font-bold">
                                    {cartCount} item{cartCount !== 1 ? 's' : ''} selected — show your budtender!
                                </p>
                            </div>
                        )}

                        <p className="text-white/50 text-sm">This screen will reset in a few seconds...</p>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
