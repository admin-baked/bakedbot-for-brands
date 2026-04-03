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

import {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    type CSSProperties,
    type SyntheticEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    captureTabletLead,
    getMoodRecommendations,
    searchTabletRecommendations,
} from '@/server/actions/loyalty-tablet';
import { getPublicBrandTheme } from '@/server/actions/checkin-management';
import { getPublicReviews } from '@/server/actions/public-review';
import {
    TABLET_MOODS,
    getTabletMoodById,
    type TabletMoodId,
    type TabletProduct,
    type TabletBundle,
} from '@/lib/checkin/loyalty-tablet-shared';
import {
    DEFAULT_PUBLIC_BRAND_THEME,
    type PublicBrandTheme,
} from '@/lib/checkin/checkin-management-shared';
import { hexToRgba } from '@/lib/utils';
import { SMOKEY_FALLBACK_IMAGE } from '@/lib/utils/product-image';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { useVoiceOutput } from '@/hooks/use-voice-output';
import {
    ArrowRight,
    Bot,
    CheckCircle2,
    ChevronRight,
    Loader2,
    Mail,
    Mic,
    MicOff,
    Phone,
    Search,
    ShoppingCart,
    Sparkles,
    Star,
    Users,
    Volume2,
    VolumeX,
} from 'lucide-react';

type Step = 'welcome' | 'phone' | 'email' | 'mood' | 'recommendations' | 'success';

const IDLE_TIMEOUT_MS = 60_000;
const STEPS = ['email', 'phone', 'mood', 'recommendations'] as const;
const ASK_SMOKEY_PLACEHOLDER = 'Ask Smokey for something like calming gummies under $30 or a social pre-roll.';
const INPUT_CLASS = 'w-full bg-white/10 border text-white placeholder-white/40 text-lg sm:text-2xl py-4 sm:py-5 px-4 sm:px-6 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/15 transition-colors';

// Warm amber used as the contrasting accent across all themes (Option A colorway)
const AMBER = '#f59e0b';
const AMBER_DARK = '#d97706';

function createShellStyle(theme: PublicBrandTheme): CSSProperties {
    const { colors } = theme;

    return {
        background: [
            `radial-gradient(circle at top left, ${hexToRgba(colors.primary, 0.35)} 0%, transparent 38%)`,
            `radial-gradient(ellipse at bottom right, ${hexToRgba(AMBER, 0.22)} 0%, transparent 40%)`,
            `linear-gradient(160deg, ${colors.background} 0%, ${hexToRgba(colors.secondary, 0.98)} 100%)`,
        ].join(', '),
        color: colors.text,
    };
}

function createPanelStyle(theme: PublicBrandTheme, tone: 'default' | 'accent' = 'default'): CSSProperties {
    const { colors } = theme;

    if (tone === 'accent') {
        return {
            background: `linear-gradient(135deg, ${hexToRgba(AMBER, 0.14)} 0%, ${hexToRgba(AMBER_DARK, 0.08)} 100%)`,
            borderColor: hexToRgba(AMBER, 0.32),
            boxShadow: `0 18px 45px ${hexToRgba(colors.background, 0.28)}`,
        };
    }

    return {
        background: `linear-gradient(180deg, ${hexToRgba('#ffffff', 0.07)} 0%, ${hexToRgba('#ffffff', 0.03)} 100%)`,
        borderColor: hexToRgba(colors.text, 0.12),
        boxShadow: `0 18px 45px ${hexToRgba(colors.background, 0.22)}`,
    };
}

function createPrimaryButtonStyle(theme: PublicBrandTheme): CSSProperties {
    return {
        background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
        boxShadow: `0 18px 45px ${hexToRgba(AMBER, 0.32)}`,
        color: '#0a0a0a',
    };
}

function createSecondaryButtonStyle(theme: PublicBrandTheme): CSSProperties {
    const { colors } = theme;

    return {
        backgroundColor: hexToRgba(colors.primary, 0.14),
        borderColor: hexToRgba(colors.primary, 0.28),
        color: colors.text,
    };
}

function createInputStyle(theme: PublicBrandTheme): CSSProperties {
    return {
        borderColor: hexToRgba(theme.colors.text, 0.18),
        backgroundColor: hexToRgba('#ffffff', 0.06),
    };
}

function handleProductImageError(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;

    if (image.dataset.fallbackApplied === 'true') {
        return;
    }

    image.dataset.fallbackApplied = 'true';
    image.src = SMOKEY_FALLBACK_IMAGE;
}

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
    const [result, setResult] = useState<{ isNewLead: boolean; loyaltyPoints: number; queuePosition?: number } | null>(null);

    const [brandTheme, setBrandTheme] = useState<PublicBrandTheme>(DEFAULT_PUBLIC_BRAND_THEME);

    // Reviews state
    const [reviews, setReviews] = useState<Array<{ rating: number; text?: string; tags: string[]; firstName?: string; createdAt: string }>>([]);
    const [reviewStats, setReviewStats] = useState<{ avgRating: number; totalCount: number }>({ avgRating: 0, totalCount: 0 });

    const [assistantQuery, setAssistantQuery] = useState('');
    const [assistantSummary, setAssistantSummary] = useState('');
    const [assistantError, setAssistantError] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);

    const {
        isListening,
        transcript,
        error: voiceInputError,
        isSupported: voiceInputSupported,
        startListening,
        stopListening,
        resetTranscript,
    } = useVoiceInput();
    const voiceOutput = useVoiceOutput();

    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetToWelcome = useCallback(() => {
        stopListening();
        resetTranscript();
        voiceOutput.stop();
        voiceOutput.setIsEnabled(false);
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
        setAssistantQuery('');
        setAssistantSummary('');
        setAssistantError('');
        setAssistantLoading(false);
    }, [resetTranscript, stopListening, voiceOutput]);

    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        // Pause idle timer during async operations and on welcome/success screens
        if (step !== 'welcome' && step !== 'success' && !recsLoading && !loading && !assistantLoading) {
            idleTimer.current = setTimeout(resetToWelcome, IDLE_TIMEOUT_MS);
        }
    }, [step, recsLoading, loading, assistantLoading, resetToWelcome]);

    useEffect(() => {
        let mounted = true;

        void getPublicBrandTheme(orgId).then((theme) => {
            if (!mounted) return;
            setBrandTheme(theme);
        });

        void getPublicReviews(orgId, 3).then((response) => {
            if (!mounted) return;
            setReviews(response.reviews);
            setReviewStats({ avgRating: response.avgRating, totalCount: response.totalCount });
        });

        return () => {
            mounted = false;
        };
    }, [orgId]);

    useEffect(() => {
        resetIdleTimer();
        return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    }, [resetIdleTimer]);

    useEffect(() => {
        if (transcript.trim()) {
            setAssistantQuery(transcript.trim());
        }
    }, [transcript]);

    // ── Step handlers ────────────────────────────────────────

    const handleEmailSubmit = () => {
        resetIdleTimer();
        setError('');
        setStep('phone');
    };

    const handlePhoneSubmit = () => {
        resetIdleTimer();
        setError('');
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setStep('mood');
    };

    const handleMoodSelect = async (moodId: TabletMoodId) => {
        if (recsLoading || step === 'recommendations') return;
        resetIdleTimer();
        stopListening();
        resetTranscript();
        voiceOutput.stop();
        setSelectedMood(moodId);
        setError('');
        setAssistantError('');
        setAssistantSummary('');
        setAssistantQuery('');
        setProducts([]);
        setBundle(null);
        setRecsLoading(true);
        setStep('recommendations');

        const recsFallbackMsg = 'Could not load recommendations - your budtender can help!';
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('timeout')), 15_000);
            });
            const response = await Promise.race([getMoodRecommendations(orgId, moodId), timeoutPromise]);
            if (response.success && response.products) {
                setProducts(response.products);
                setBundle(response.bundle ?? null);
            } else {
                setError(recsFallbackMsg);
            }
        } catch {
            setError(recsFallbackMsg);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            setRecsLoading(false);
        }
    };

    const handleAssistantSearch = async (rawQuery?: string) => {
        const query = (rawQuery ?? assistantQuery).trim();
        resetIdleTimer();

        if (query.length < 3) {
            setAssistantError('Tell Smokey a little more so we can narrow the menu down.');
            return;
        }

        setAssistantLoading(true);
        setAssistantError('');
        setAssistantSummary('');
        setError('');
        voiceOutput.stop();

        try {
            const response = await searchTabletRecommendations(orgId, query, selectedMood);

            if (!response.success || !response.products?.length) {
                setAssistantError(response.error || 'Smokey could not narrow the menu down yet.');
                return;
            }

            setProducts(response.products);
            setBundle(response.bundle ?? null);
            setAssistantSummary(
                response.summary || `Smokey found ${response.products.length} live-menu matches for "${query}".`
            );

            if (voiceOutput.isEnabled && voiceOutput.isSupported) {
                voiceOutput.speak(
                    response.summary || `I found ${response.products.length} products for ${query}.`
                );
            }
        } catch (searchError) {
            setAssistantError(
                searchError instanceof Error ? searchError.message : 'Smokey could not search the live menu right now.'
            );
        } finally {
            setAssistantLoading(false);
        }
    };

    const handleVoiceToggle = () => {
        resetIdleTimer();
        setAssistantError('');

        const nextEnabled = !voiceOutput.isEnabled;
        voiceOutput.setIsEnabled(nextEnabled);

        if (!nextEnabled) {
            voiceOutput.stop();
            return;
        }

        if (voiceOutput.isSupported) {
            voiceOutput.speak(
                'Voice guide is on. Ask for something like calming gummies under thirty dollars or a social pre-roll.'
            );
        }
    };

    const handleMicToggle = () => {
        resetIdleTimer();
        setAssistantError('');

        if (!voiceInputSupported) {
            setAssistantError('Voice input is not supported on this browser. You can still type a request.');
            return;
        }

        if (isListening) {
            stopListening();
            return;
        }

        resetTranscript();
        setAssistantQuery('');
        startListening();
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
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('Check-in timed out - please try again.')), 20_000);
            });
            const res = await Promise.race([
                captureTabletLead({
                    orgId,
                    firstName,
                    email: email || undefined,
                    phone: phone || undefined,
                    emailConsent,
                    smsConsent,
                    mood: selectedMood ?? undefined,
                    cartProductIds: [...new Set([...cart, ...(bundleAdded && bundle ? bundle.products.map(p => p.productId) : [])])],
                    bundleAdded,
                }),
                timeoutPromise,
            ]);
            if (timeoutId) clearTimeout(timeoutId);
            if (res.success) {
                setResult({ isNewLead: res.isNewLead ?? true, loyaltyPoints: res.loyaltyPoints || 0, queuePosition: res.queuePosition });
                setStep('success');
                setTimeout(resetToWelcome, 14_000);
            } else {
                setError(res.error || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
    const {
        brandName,
        shellStyle,
        panelStyle,
        accentPanelStyle,
        primaryButtonStyle,
        secondaryButtonStyle,
        inputStyle,
        mutedTextColor,
        faintTextColor,
        glowColor,
    } = useMemo(() => ({
        brandName: brandTheme.brandName || 'Thrive Syracuse',
        shellStyle: createShellStyle(brandTheme),
        panelStyle: createPanelStyle(brandTheme),
        accentPanelStyle: createPanelStyle(brandTheme, 'accent'),
        primaryButtonStyle: createPrimaryButtonStyle(brandTheme),
        secondaryButtonStyle: createSecondaryButtonStyle(brandTheme),
        inputStyle: createInputStyle(brandTheme),
        mutedTextColor: hexToRgba(brandTheme.colors.text, 0.72),
        faintTextColor: hexToRgba(brandTheme.colors.text, 0.42),
        glowColor: hexToRgba(brandTheme.colors.primary, 0.18),
    }), [brandTheme]);

    // ── Render ────────────────────────────────────────────────

    return (
        <div
            className="relative min-h-screen w-full overflow-y-auto px-4 pb-10 pt-24 sm:px-8"
            style={shellStyle}
            onTouchStart={resetIdleTimer}
            onClick={resetIdleTimer}
        >
            <div className="absolute inset-0 opacity-70 pointer-events-none" aria-hidden="true">
                <div
                    className="absolute left-8 top-16 h-32 w-32 rounded-full blur-3xl"
                    style={{ backgroundColor: glowColor }}
                />
                <div
                    className="absolute bottom-10 right-10 h-40 w-40 rounded-full blur-3xl"
                    style={{ backgroundColor: hexToRgba(brandTheme.colors.accent, 0.12) }}
                />
            </div>
            {/* Header — logo hidden on welcome (shown in body); always visible on other steps */}
            <div className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-3">
                {step !== 'welcome' && (brandTheme.logoUrl ? (
                    <img
                        src={brandTheme.logoUrl}
                        alt={`${brandName} logo`}
                        className="h-10 w-auto max-w-[180px] object-contain"
                    />
                ) : (
                    <span className="text-2xl font-black tracking-tight" style={{ color: brandTheme.colors.primary }}>
                        {brandName}
                    </span>
                ))}
                {cartCount > 0 && step === 'recommendations' && (
                    <div
                        className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold"
                        style={secondaryButtonStyle}
                    >
                        <ShoppingCart className="h-4 w-4" />
                        {cartCount}
                    </div>
                )}
            </div>

            {/* Step progress dots */}
            {step !== 'welcome' && step !== 'success' && (
                <div className="absolute right-8 top-6 z-10 flex gap-2">
                    {STEPS.map((currentStep, index) => {
                        const activeIndex = STEPS.indexOf(step as typeof STEPS[number]);
                        const isActive = currentStep === step;
                        const isComplete = index < activeIndex;

                        return (
                            <div
                                key={currentStep}
                                className="h-2 w-2 rounded-full transition-colors"
                                style={{
                                    backgroundColor: isActive
                                        ? brandTheme.colors.primary
                                        : isComplete
                                            ? brandTheme.colors.accent
                                            : hexToRgba(brandTheme.colors.text, 0.18),
                                }}
                            />
                        );
                    })}
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
                        className="relative z-10 mx-auto flex max-w-xl flex-col items-center gap-8 text-center"
                    >
                        {brandTheme.logoUrl ? (
                            <img
                                src={brandTheme.logoUrl}
                                alt={`${brandName} logo`}
                                className="h-24 w-auto max-w-[280px] object-contain sm:h-32"
                            />
                        ) : (
                            <div className="text-6xl sm:text-8xl">🍃</div>
                        )}
                        <div>
                            <h1 className="mb-3 text-3xl font-black text-white sm:text-5xl">Welcome to {brandName}</h1>
                            <p className="text-base sm:text-xl" style={{ color: mutedTextColor }}>
                                Check in to earn loyalty points, get image-rich picks, and let Smokey help your budtender
                                find the right product faster.
                            </p>
                        </div>
                        <div className="flex w-full gap-4 text-center">
                            {[
                                { icon: '🎯', label: 'Smokey Recommends', sub: 'Picks just for you' },
                                { icon: '⭐', label: 'Earn Points', sub: '1 point per $1 spent' },
                                { icon: '🎁', label: 'Weekly Deals', sub: 'Members-only offers' },
                            ].map(item => (
                                <div key={item.label} className="flex-1 rounded-[28px] border p-4" style={panelStyle}>
                                    <div className="mb-2 text-3xl">{item.icon}</div>
                                    <div className="text-sm font-bold text-white">{item.label}</div>
                                    <div className="mt-1 text-xs" style={{ color: mutedTextColor }}>{item.sub}</div>
                                </div>
                            ))}
                        </div>
                        {/* Customer Reviews */}
                        {reviewStats.totalCount > 0 && (
                            <div className="w-full space-y-3 rounded-[28px] border p-4" style={panelStyle}>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(reviewStats.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm text-white font-bold">{reviewStats.avgRating.toFixed(1)}</span>
                                    <span className="text-xs" style={{ color: faintTextColor }}>({reviewStats.totalCount} reviews)</span>
                                </div>
                                {reviews
                                    .filter(r => r.text)
                                    .slice(0, 2)
                                    .map(review => (
                                        <div key={review.createdAt} className="truncate px-4 text-center text-xs italic" style={{ color: mutedTextColor }}>
                                            &ldquo;{review.text}&rdquo;
                                        </div>
                                    ))}
                            </div>
                        )}

                        <button
                            onClick={() => setStep('email')}
                            className="flex w-full items-center justify-center gap-3 rounded-[28px] px-8 py-5 text-xl font-bold transition-all hover:opacity-95 active:scale-[0.99] sm:text-2xl sm:py-6"
                            style={primaryButtonStyle}
                        >
                            Check In <ArrowRight className="h-7 w-7" />
                        </button>
                        <p className="text-sm" style={{ color: faintTextColor }}>Tap to begin</p>
                    </motion.div>
                )}

                {/* ── EMAIL (step 1) ── */}
                {step === 'email' && (
                    <motion.div
                        key="email"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <Mail className="mx-auto mb-4 h-10 w-10 sm:h-14 sm:w-14" style={{ color: brandTheme.colors.primary }} />
                            <h2 className="text-2xl sm:text-4xl font-black text-white">What&apos;s your name & email?</h2>
                            <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>Get weekly deals, bundles &amp; education</p>
                        </div>
                        <div className="w-full space-y-4">
                            <input
                                type="text"
                                placeholder="First name"
                                value={firstName}
                                onChange={e => { setFirstName(e.target.value); resetIdleTimer(); }}
                                className={INPUT_CLASS}
                                style={inputStyle}
                                autoComplete="given-name"
                            />
                            <input
                                type="email"
                                placeholder="you@example.com (optional)"
                                value={email}
                                onChange={e => { setEmail(e.target.value); resetIdleTimer(); }}
                                className={INPUT_CLASS}
                                style={inputStyle}
                                inputMode="email"
                                autoComplete="email"
                            />
                        </div>
                        {error && <p className="text-sm text-red-300">{error}</p>}
                        <button
                            onClick={handleEmailSubmit}
                            disabled={!firstName.trim()}
                            className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                            style={primaryButtonStyle}
                        >
                            Continue <ArrowRight className="h-7 w-7" />
                        </button>
                        <button onClick={() => { setError(''); resetToWelcome(); }} className="text-sm hover:text-white/70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── PHONE (step 2) ── */}
                {step === 'phone' && (
                    <motion.div
                        key="phone"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <Phone className="mx-auto mb-4 h-10 w-10 sm:h-14 sm:w-14" style={{ color: brandTheme.colors.primary }} />
                            <h2 className="text-2xl sm:text-4xl font-black text-white">What&apos;s your phone number?</h2>
                            <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>We&apos;ll text you exclusive deals</p>
                        </div>
                        <div className="w-full space-y-4">
                            <input
                                type="tel"
                                placeholder="(555) 000-0000"
                                value={phone}
                                onChange={e => { setPhone(formatPhone(e.target.value)); resetIdleTimer(); }}
                                className={INPUT_CLASS}
                                style={inputStyle}
                                inputMode="tel"
                                autoComplete="tel"
                            />
                            <div className="space-y-3">
                                {[
                                    { checked: smsConsent, onChange: setSmsConsent, label: 'Yes, text me deals & updates' },
                                    { checked: emailConsent, onChange: setEmailConsent, label: 'Yes, email me weekly newsletter' },
                                ].map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => { item.onChange(!item.checked); resetIdleTimer(); }}
                                        className="flex w-full items-center gap-4 rounded-[24px] border-2 p-4 transition-all"
                                        style={item.checked ? accentPanelStyle : panelStyle}
                                    >
                                        <div
                                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                                            style={{
                                                borderColor: item.checked ? brandTheme.colors.primary : hexToRgba(brandTheme.colors.text, 0.4),
                                                backgroundColor: item.checked ? brandTheme.colors.primary : 'transparent',
                                            }}
                                        >
                                            {item.checked && <CheckCircle2 className="h-5 w-5 text-white" />}
                                        </div>
                                        <span className="text-lg text-white text-left">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="px-4 text-center text-xs" style={{ color: faintTextColor }}>
                                You can opt out anytime. We never share your data. Msg &amp; data rates may apply.
                            </p>
                        </div>
                        {error && <p className="text-sm text-red-300">{error}</p>}
                        <button
                            onClick={handlePhoneSubmit}
                            disabled={phone.replace(/\D/g, '').length < 10}
                            className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                            style={primaryButtonStyle}
                        >
                            Continue <ArrowRight className="h-7 w-7" />
                        </button>
                        <button onClick={() => { setError(''); setStep('email'); }} className="text-sm hover:text-white/70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── MOOD ── */}
                {step === 'mood' && (
                    <motion.div
                        key="mood"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-2xl"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-4xl font-black text-white">
                                How are you feeling today{firstName ? `, ${firstName}` : ''}?
                            </h2>
                            <p className="mt-2 text-sm sm:text-lg" style={{ color: mutedTextColor }}>
                                Smokey will pull product cards from the live menu, and your budtender can refine them with voice.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                            {TABLET_MOODS.map(mood => (
                                <button
                                    key={mood.id}
                                    onClick={() => { void handleMoodSelect(mood.id); }}
                                    className="flex items-center gap-2 rounded-[24px] border p-3 text-left transition-all hover:opacity-95 active:scale-[0.99] sm:gap-4 sm:p-5"
                                    style={panelStyle}
                                >
                                    <span className="text-2xl sm:text-4xl shrink-0">{mood.emoji}</span>
                                    <span className="text-sm sm:text-xl font-bold text-white leading-tight">{mood.label}</span>
                                </button>
                            ))}
                            </div>

                        <button
                            onClick={() => handleSubmit()}
                            disabled={loading}
                            className="text-sm hover:text-white/70 disabled:opacity-40"
                            style={{ color: faintTextColor }}
                        >
                            {loading ? 'Saving...' : 'Skip for now'}
                        </button>
                        <button onClick={() => setStep('phone')} className="text-sm hover:text-white/70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── RECOMMENDATIONS ── */}
                {step === 'recommendations' && (
                    <motion.div
                        key="recommendations"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-4xl"
                    >
                        {recsLoading ? (
                            <div className="flex flex-col items-center gap-6 py-8 sm:py-12">
                                <Loader2 className="h-12 w-12 animate-spin sm:h-16 sm:w-16" style={{ color: brandTheme.colors.primary }} />
                                <div className="text-center">
                                    <p className="text-xl sm:text-2xl font-bold text-white">
                                        Smokey is finding your perfect match...
                                    </p>
                                    <p className="mt-2" style={{ color: mutedTextColor }}>
                                        {selectedMoodDef?.emoji} {selectedMoodDef?.label}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-center">
                                    <p className="text-xl" style={{ color: brandTheme.colors.primary }}>
                                        {selectedMoodDef?.emoji} Smokey Recommends for <span className="text-white font-bold">{selectedMoodDef?.label}</span>
                                    </p>
                                </div>

                                <div className="w-full rounded-[28px] border p-5 sm:p-6" style={accentPanelStyle}>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: brandTheme.colors.primary }}>
                                                    <Bot className="h-4 w-4" />
                                                    Ask Smokey
                                                </div>
                                                <p className="text-base font-semibold text-white sm:text-lg">
                                                    Customer and budtender can talk through the menu together.
                                                </p>
                                                <p className="text-sm" style={{ color: mutedTextColor }}>
                                                    Try: &ldquo;Something social under $35&rdquo; or &ldquo;A beginner-friendly edible.&rdquo;
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleVoiceToggle}
                                                disabled={!voiceOutput.isSupported}
                                                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:opacity-95 disabled:opacity-40"
                                                style={secondaryButtonStyle}
                                            >
                                                {voiceOutput.isEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                                {voiceOutput.isEnabled ? 'Voice Guide On' : 'Voice Guide Off'}
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-3 lg:flex-row">
                                            <div className="flex flex-1 items-center gap-3 rounded-[24px] border px-4 py-3" style={panelStyle}>
                                                <Search className="h-5 w-5 shrink-0" style={{ color: brandTheme.colors.primary }} />
                                                <input
                                                    type="text"
                                                    value={assistantQuery}
                                                    onChange={(event) => { setAssistantQuery(event.target.value); resetIdleTimer(); }}
                                                    placeholder={ASK_SMOKEY_PLACEHOLDER}
                                                    className="w-full bg-transparent text-base text-white placeholder-white/40 focus:outline-none sm:text-lg"
                                                />
                                            </div>

                                            <div className="flex gap-3 lg:w-auto">
                                                <button
                                                    onClick={handleMicToggle}
                                                    className="inline-flex min-w-[128px] items-center justify-center gap-2 rounded-[24px] border px-4 py-3 text-sm font-semibold transition-all hover:opacity-95 active:scale-[0.99]"
                                                    style={secondaryButtonStyle}
                                                >
                                                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                                    {isListening ? 'Stop Mic' : 'Use Mic'}
                                                </button>
                                                <button
                                                    onClick={() => { void handleAssistantSearch(); }}
                                                    disabled={assistantLoading || assistantQuery.trim().length < 3}
                                                    className="inline-flex min-w-[144px] items-center justify-center gap-2 rounded-[24px] px-5 py-3 text-sm font-semibold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                                                    style={primaryButtonStyle}
                                                >
                                                    {assistantLoading ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Sparkles className="h-5 w-5" />
                                                            Ask Smokey
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {(isListening || assistantSummary || assistantError || voiceInputError) && (
                                            <div className="rounded-[24px] border p-4" style={panelStyle}>
                                                {isListening && (
                                                    <p className="text-sm font-medium" style={{ color: brandTheme.colors.primary }}>
                                                        Listening now... speak your product request.
                                                    </p>
                                                )}
                                                {!isListening && assistantSummary && (
                                                    <p className="text-sm font-medium text-white">{assistantSummary}</p>
                                                )}
                                                {!isListening && (assistantError || voiceInputError) && (
                                                    <p className="text-sm text-red-300">{assistantError || voiceInputError}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Individual products */}
                                <div className="w-full space-y-3">
                                    {products.map(product => {
                                        const inCart = cart.includes(product.productId);
                                        return (
                                            <div
                                                key={product.productId}
                                                className="flex flex-col gap-4 rounded-[28px] border p-4 transition-all sm:flex-row sm:items-center"
                                                style={inCart ? accentPanelStyle : panelStyle}
                                            >
                                                <div
                                                    className="relative h-24 w-full overflow-hidden rounded-[22px] border sm:h-28 sm:w-28 sm:shrink-0"
                                                    style={{ borderColor: hexToRgba(brandTheme.colors.text, 0.12) }}
                                                >
                                                    <img
                                                        src={product.imageUrl || SMOKEY_FALLBACK_IMAGE}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover"
                                                        onError={handleProductImageError}
                                                    />
                                                    <div
                                                        className="absolute inset-x-0 bottom-0 h-14"
                                                        style={{
                                                            background: `linear-gradient(180deg, ${hexToRgba('#000000', 0)} 0%, ${hexToRgba('#000000', 0.42)} 100%)`,
                                                        }}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-lg font-bold text-white sm:text-xl">{product.name}</p>
                                                    <p className="mt-1 truncate text-sm" style={{ color: brandTheme.colors.primary }}>
                                                        {product.category}{product.brandName ? ` - ${product.brandName}` : ''}
                                                    </p>
                                                    <p className="mt-2 text-sm leading-relaxed" style={{ color: mutedTextColor }}>{product.reason}</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                                                    <p className="text-2xl font-black text-white">${product.price.toFixed(2)}</p>
                                                    <button
                                                        onClick={() => toggleCart(product.productId)}
                                                        className="rounded-[18px] px-4 py-2 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                                                        style={inCart ? secondaryButtonStyle : primaryButtonStyle}
                                                    >
                                                        {inCart ? 'Added' : '+ Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Bundle */}
                                {bundle && (
                                    <div className="w-full rounded-[30px] border p-5 transition-all sm:p-6" style={bundleAdded ? accentPanelStyle : panelStyle}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Star className="h-5 w-5" style={{ color: brandTheme.colors.primary }} />
                                                    <span className="text-sm font-bold uppercase tracking-wide" style={{ color: brandTheme.colors.primary }}>Bundle Pick</span>
                                                </div>
                                                <p className="text-xl font-black text-white">{bundle.name}</p>
                                                <p className="mb-2 text-sm italic" style={{ color: mutedTextColor }}>{bundle.tagline}</p>
                                                <div className="space-y-1">
                                                    {bundle.products.map(p => (
                                                        <p key={p.productId} className="text-sm" style={{ color: mutedTextColor }}>
                                                            <ChevronRight className="inline h-3 w-3" style={{ color: brandTheme.colors.primary }} /> {p.name}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-2xl font-black text-white">${bundle.totalPrice.toFixed(2)}</p>
                                                <button
                                                    onClick={() => { setBundleAdded(!bundleAdded); resetIdleTimer(); }}
                                                    className="mt-2 rounded-[18px] border px-4 py-2 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                                                    style={bundleAdded ? primaryButtonStyle : secondaryButtonStyle}
                                                >
                                                    {bundleAdded ? 'Added Bundle' : '+ Add Bundle'}
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
                                        className="flex-1 flex items-center justify-center gap-3 rounded-[28px] py-5 text-xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
                                        style={primaryButtonStyle}
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

                                {error && <p className="text-center text-sm text-red-300">{error}</p>}
                                <button onClick={() => setStep('mood')} className="text-sm hover:text-white/70" style={{ color: faintTextColor }}>&larr; Change feeling</button>
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
                        className="relative z-10 flex max-w-lg flex-col items-center gap-8 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                        >
                            <CheckCircle2 className="h-28 w-28" style={{ color: brandTheme.colors.primary }} />
                        </motion.div>

                        <div>
                            <h1 className="mb-3 text-3xl font-black text-white sm:text-5xl">
                                {result?.isNewLead
                                    ? `You're checked in, ${firstName || 'friend'}!`
                                    : `Welcome back, ${firstName || 'friend'}!`}
                            </h1>
                            <p className="text-base sm:text-xl" style={{ color: mutedTextColor }}>
                                {result?.isNewLead
                                    ? 'Your Thrive follow-ups are set if you opted in.'
                                    : 'Your check-in is recorded and your loyalty balance is ready.'}
                            </p>
                        </div>

                        {result && result.loyaltyPoints > 0 && (
                            <div className="flex items-center gap-4 rounded-[28px] border px-8 py-5" style={accentPanelStyle}>
                                <Star className="h-10 w-10" style={{ color: brandTheme.colors.primary }} />
                                <div className="text-left">
                                    <div className="text-3xl font-black text-white">{result.loyaltyPoints} pts</div>
                                    <div className="text-sm" style={{ color: mutedTextColor }}>Your loyalty balance</div>
                                </div>
                            </div>
                        )}

                        {result && result.queuePosition !== undefined && result.queuePosition > 0 && (
                            <div className="flex items-center gap-4 rounded-[28px] border px-8 py-5" style={panelStyle}>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black" style={{ backgroundColor: hexToRgba(AMBER, 0.18), color: AMBER }}>
                                    {result.queuePosition}
                                </div>
                                <div className="text-left">
                                    <div className="text-lg font-bold text-white">
                                        {result.queuePosition === 1 ? '1 customer ahead' : `${result.queuePosition} customers ahead`}
                                    </div>
                                    <div className="text-sm" style={{ color: mutedTextColor }}>A budtender will be right with you</div>
                                </div>
                            </div>
                        )}

                        {cartCount > 0 && (
                            <div className="flex items-center gap-3 rounded-[28px] border px-8 py-4" style={panelStyle}>
                                <ShoppingCart className="h-8 w-8" style={{ color: brandTheme.colors.primary }} />
                                <p className="font-bold text-white">
                                    {cartCount} item{cartCount !== 1 ? 's' : ''} selected - show your budtender!
                                </p>
                            </div>
                        )}

                        <p className="text-sm" style={{ color: faintTextColor }}>This screen will reset in a few seconds...</p>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
