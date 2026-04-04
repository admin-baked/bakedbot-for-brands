'use client';

/**
 * Loyalty Tablet Page
 *
 * Full-screen touch-optimized flow for in-store check-in at Thrive Syracuse.
 * Designed for iPad at the dispensary counter.
 * Auto-resets after idle.
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
    quickLookupByPhoneLast4,
    getTabletOffer,
    getCustomerBudtenderContext,
    prefetchTabletInventory,
    lookupCustomerByPhone,
    type QuickLookupResult,
    type TabletOffer,
    type BudtenderContext,
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
import { useSmokeyVoice } from '@/hooks/use-smokey-voice';
import { useVoiceOutput } from '@/hooks/use-voice-output';
import {
    ArrowRight,
    CheckCircle2,
    ChevronRight,
    Loader2,
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

type Step = 'welcome' | 'quick_lookup' | 'phone' | 'offer' | 'mood' | 'recommendations' | 'success';

const IDLE_TIMEOUT_MS = 60_000;
// phone → offer → mood → recommendations
const STEPS = ['phone', 'offer', 'mood', 'recommendations'] as const;
const ASK_SMOKEY_PLACEHOLDER = 'Ask Smokey for something like calming gummies under $30 or a social pre-roll.';

// Clean light-mode input — dark text on white background
const INPUT_CLASS = 'w-full border text-gray-900 placeholder-gray-400 text-lg sm:text-2xl py-4 sm:py-5 px-4 sm:px-6 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors';

// Warm amber accent used for primary actions
const AMBER = '#f59e0b';
const AMBER_DARK = '#d97706';

// ─── Style helpers (light / white mode) ──────────────────────────────────────

function createShellStyle(theme: PublicBrandTheme): CSSProperties {
    return {
        // White background with a whisper of brand green at the very top
        background: `linear-gradient(180deg, ${hexToRgba(theme.colors.primary, 0.06)} 0%, #ffffff 10%)`,
        color: '#111827',
    };
}

function createPanelStyle(_theme: PublicBrandTheme, tone: 'default' | 'accent' = 'default'): CSSProperties {
    if (tone === 'accent') {
        return {
            background: `linear-gradient(135deg, ${hexToRgba(AMBER, 0.08)} 0%, ${hexToRgba(AMBER_DARK, 0.04)} 100%)`,
            borderColor: hexToRgba(AMBER, 0.3),
        };
    }
    return {
        background: '#ffffff',
        borderColor: '#e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    };
}

function createPrimaryButtonStyle(_theme: PublicBrandTheme): CSSProperties {
    return {
        background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
        boxShadow: `0 8px 24px ${hexToRgba(AMBER, 0.28)}`,
        color: '#ffffff',
    };
}

function createSecondaryButtonStyle(theme: PublicBrandTheme): CSSProperties {
    return {
        backgroundColor: hexToRgba(theme.colors.primary, 0.08),
        borderColor: hexToRgba(theme.colors.primary, 0.24),
        color: theme.colors.primary,
    };
}

function createInputStyle(_theme: PublicBrandTheme): CSSProperties {
    return {
        borderColor: '#d1d5db',
        backgroundColor: '#ffffff',
    };
}

function handleProductImageError(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === 'true') return;
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

    // Personalization dossier
    const [birthday, setBirthday] = useState('');
    const [visitPreferences, setVisitPreferences] = useState<string[]>([]);
    const [tabletOffer, setTabletOffer] = useState<TabletOffer | null>(null);
    const [offerClaimed, setOfferClaimed] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);

    // Budtender context (returning customers)
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [budtenderContext, setBudtenderContext] = useState<BudtenderContext | null>(null);
    const [budtenderName, setBudtenderName] = useState('');

    // Mood + recs state
    const [selectedMood, setSelectedMood] = useState<TabletMoodId | null>(null);
    const [recsLoading, setRecsLoading] = useState(false);
    const [products, setProducts] = useState<TabletProduct[]>([]);
    const [bundle, setBundle] = useState<TabletBundle | null>(null);
    const [cart, setCart] = useState<string[]>([]);
    const [bundleAdded, setBundleAdded] = useState(false);

    // Submit state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ isNewLead: boolean; loyaltyPoints: number; queuePosition?: number } | null>(null);

    const [brandTheme, setBrandTheme] = useState<PublicBrandTheme>(DEFAULT_PUBLIC_BRAND_THEME);
    const [reviews, setReviews] = useState<Array<{ rating: number; text?: string; tags: string[]; firstName?: string; createdAt: string }>>([]);
    const [reviewStats, setReviewStats] = useState<{ avgRating: number; totalCount: number }>({ avgRating: 0, totalCount: 0 });

    const [assistantQuery, setAssistantQuery] = useState('');
    const [assistantSummary, setAssistantSummary] = useState('');
    const [assistantError, setAssistantError] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);

    // Quick returning-customer lookup state
    const [quickDigits, setQuickDigits] = useState('');
    const [quickLookupLoading, setQuickLookupLoading] = useState(false);
    const [quickMatches, setQuickMatches] = useState<QuickLookupResult['matches']>([]);

    // Full-flow returning-customer detection (phone pre-fill + offer skip)
    const [isReturningCustomer, setIsReturningCustomer] = useState(false);

    // Smokey hold-to-talk voice (works on iOS — MediaRecorder-based, Gemini Live quality)
    const smokeyVoice = useSmokeyVoice({
        orgId,
        customerName: firstName || undefined,
        mood: selectedMood ?? undefined,
        cartItems: cart,
    });

    // TTS for proactive voice guidance (Smokey's text → audio)
    const voiceOutput = useVoiceOutput();

    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Enable voice guide by default on mount ────────────────
    useEffect(() => {
        voiceOutput.setIsEnabled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── When Smokey responds via voice, fill in the transcript ─
    useEffect(() => {
        if (!smokeyVoice.transcript) return;
        setAssistantSummary(smokeyVoice.transcript);
    }, [smokeyVoice.transcript]);

    // ── Auto-run menu search from what the user said ───────────
    useEffect(() => {
        if (!smokeyVoice.inputTranscript || smokeyVoice.state !== 'speaking') return;
        setAssistantQuery(smokeyVoice.inputTranscript);
        void handleAssistantSearch(smokeyVoice.inputTranscript);
    // handleAssistantSearch is stable enough; including it causes a loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [smokeyVoice.inputTranscript, smokeyVoice.state]);

    const resetToWelcome = useCallback(() => {
        smokeyVoice.cancel();
        voiceOutput.stop();
        voiceOutput.setIsEnabled(false);
        setStep('welcome');
        setFirstName('');
        setPhone('');
        setEmail('');
        setEmailConsent(false);
        setSmsConsent(false);
        setBirthday('');
        setVisitPreferences([]);
        setTabletOffer(null);
        setOfferClaimed(false);
        setOfferLoading(false);
        setCustomerId(null);
        setBudtenderContext(null);
        setBudtenderName('');
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
        setQuickDigits('');
        setQuickLookupLoading(false);
        setQuickMatches([]);
        setIsReturningCustomer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceOutput]);

    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (step !== 'welcome' && step !== 'success' && !recsLoading && !loading && !assistantLoading) {
            idleTimer.current = setTimeout(resetToWelcome, IDLE_TIMEOUT_MS);
        }
    }, [step, recsLoading, loading, assistantLoading, resetToWelcome]);

    useEffect(() => {
        let mounted = true;
        void getPublicBrandTheme(orgId).then((theme) => { if (mounted) setBrandTheme(theme); });
        void getPublicReviews(orgId, 3).then((response) => {
            if (!mounted) return;
            setReviews(response.reviews);
            setReviewStats({ avgRating: response.avgRating, totalCount: response.totalCount });
        });
        return () => { mounted = false; };
    }, [orgId]);

    useEffect(() => {
        resetIdleTimer();
        return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    }, [resetIdleTimer]);

    // ── Full-phone returning-customer lookup (pre-fill + offer skip) ─
    useEffect(() => {
        // Clear returning-customer state if phone drops below 10 digits
        if (step === 'phone' && phone.replace(/\D/g, '').length < 10 && isReturningCustomer) {
            setIsReturningCustomer(false);
            setCustomerId(null);
            setBudtenderContext(null);
        }
        if (step !== 'phone' || phone.replace(/\D/g, '').length !== 10 || customerId) return;
        void lookupCustomerByPhone(orgId, phone).then(res => {
            if (!res.found || !res.customerId) return;
            setCustomerId(res.customerId);
            if (res.firstName && !firstName) setFirstName(res.firstName);
            setIsReturningCustomer(true);
            // Pre-fetch budtender context in background
            void getCustomerBudtenderContext(orgId, res.customerId).then(ctx => {
                if (ctx.success && ctx.context) setBudtenderContext(ctx.context);
            });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone]);

    // ── Pre-fetch offer as soon as phone hits 10 digits ───────
    useEffect(() => {
        if (step !== 'phone' || phone.replace(/\D/g, '').length !== 10 || offerLoading || tabletOffer) return;
        setOfferLoading(true);
        void getTabletOffer(orgId).then(res => {
            if (res.success && res.offer) setTabletOffer(res.offer);
            setOfferLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone]);

    // ── Pre-warm inventory cache when mood step renders ───────
    useEffect(() => {
        if (step !== 'mood') return;
        void prefetchTabletInventory(orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // ── Step handlers ────────────────────────────────────────

    const handleQuickLookup = async (digits?: string) => {
        const lookup = digits ?? quickDigits;
        if (lookup.length !== 4) return;
        resetIdleTimer();
        setQuickLookupLoading(true);
        setError('');
        try {
            const result = await quickLookupByPhoneLast4(orgId, lookup);
            if (result.found && result.matches.length === 1) {
                // Single match — auto-fill and skip to mood
                const m = result.matches[0];
                setFirstName(m.firstName);
                setPhone(''); // we'll prefill via customerId
                setStep('mood');
            } else if (result.found && result.matches.length > 1) {
                setQuickMatches(result.matches);
            } else {
                // Not found — continue with full flow (phone is already their digits hint)
                setPhone(lookup);
                setStep('phone');
            }
        } catch {
            setStep('phone');
        } finally {
            setQuickLookupLoading(false);
        }
    };

    const handleQuickMatchSelect = (match: QuickLookupResult['matches'][number]) => {
        resetIdleTimer();
        setFirstName(match.firstName);
        setCustomerId(match.customerId);
        setQuickMatches([]);
        // Fetch budtender context in background
        void getCustomerBudtenderContext(orgId, match.customerId).then(res => {
            if (res.success && res.context) setBudtenderContext(res.context);
        });
        setStep('mood');
    };

    const handlePhoneSubmit = () => {
        resetIdleTimer();
        setError('');
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        // Returning customers skip the offer/birthday step — go straight to mood
        if (isReturningCustomer) {
            setStep('mood');
            return;
        }
        // Fetch offer only if not already in-flight or loaded (may have started at 10-digit entry)
        if (!tabletOffer && !offerLoading) {
            setOfferLoading(true);
            void getTabletOffer(orgId).then(res => {
                if (res.success && res.offer) setTabletOffer(res.offer);
                setOfferLoading(false);
            });
        }
        setStep('offer');
    };

    const handleOfferSubmit = () => {
        resetIdleTimer();
        setError('');
        setStep('mood');
    };

    const toggleVisitPreference = (pref: string) => {
        resetIdleTimer();
        setVisitPreferences(prev =>
            prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]
        );
    };

    const handleMoodSelect = async (moodId: TabletMoodId) => {
        if (recsLoading || step === 'recommendations') return;
        resetIdleTimer();
        smokeyVoice.cancel();
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
                // Auto-greet once products are ready
                const moodLabel = getTabletMoodById(moodId)?.label ?? '';
                const budtender = budtenderName.trim();
                const greeting = firstName
                    ? `Hey ${firstName}! I'm Smokey, your AI budtender.${budtender ? ` ${budtender} is ready for you.` : ''} Here are my top picks for ${moodLabel}. Your budtender can help you narrow it down.`
                    : `Welcome! I'm Smokey, your AI budtender. Here are my top picks for ${moodLabel}.`;
                if (voiceOutput.isEnabled && voiceOutput.isSupported) {
                    voiceOutput.speak(greeting);
                }
                setAssistantSummary(greeting);
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

    // Hold-to-talk: press → record, release → send to Smokey (works on iOS)
    const handleMicPointerDown = () => {
        resetIdleTimer();
        setAssistantError('');
        if (!smokeyVoice.isSupported) {
            setAssistantError('Microphone not supported on this browser.');
            return;
        }
        if (smokeyVoice.state === 'recording') return;
        smokeyVoice.startRecording();
    };

    const handleMicPointerUp = () => {
        if (smokeyVoice.state === 'recording') {
            smokeyVoice.stopAndSend();
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
                    birthday: birthday || undefined,
                    visitPreferences: visitPreferences.length ? visitPreferences : undefined,
                    offerProductId: offerClaimed && tabletOffer ? tabletOffer.productId : undefined,
                }),
                timeoutPromise,
            ]);
            if (timeoutId) clearTimeout(timeoutId);
            if (res.success) {
                if (res.customerId) setCustomerId(res.customerId);
                setResult({ isNewLead: res.isNewLead ?? true, loyaltyPoints: res.loyaltyPoints || 0, queuePosition: res.queuePosition });
                setStep('success');
                // Farewell salutation via TTS
                const budtender = budtenderName.trim();
                const salutation = firstName
                    ? `See you next time, ${firstName}! ${budtender ? `${budtender} has your picks ready.` : 'Your budtender has your picks ready.'} Enjoy!`
                    : `Thanks for stopping by! ${budtender ? `${budtender} is ready to help.` : 'Your budtender is ready to help.'} Enjoy!`;
                if (voiceOutput.isEnabled && voiceOutput.isSupported) {
                    voiceOutput.speak(salutation);
                }
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
    } = useMemo(() => ({
        brandName: brandTheme.brandName || 'Thrive Syracuse',
        shellStyle: createShellStyle(brandTheme),
        panelStyle: createPanelStyle(brandTheme),
        accentPanelStyle: createPanelStyle(brandTheme, 'accent'),
        primaryButtonStyle: createPrimaryButtonStyle(brandTheme),
        secondaryButtonStyle: createSecondaryButtonStyle(brandTheme),
        inputStyle: createInputStyle(brandTheme),
        mutedTextColor: '#6b7280',
        faintTextColor: '#9ca3af',
    }), [brandTheme]);

    // Mic button visual state
    const micIsActive = smokeyVoice.state === 'recording';
    const micIsProcessing = smokeyVoice.state === 'processing' || smokeyVoice.state === 'speaking';

    // ── Render ────────────────────────────────────────────────

    return (
        <div
            className="relative min-h-screen w-full overflow-y-auto px-4 pb-10 pt-24 sm:px-8"
            style={shellStyle}
            onTouchStart={resetIdleTimer}
            onClick={resetIdleTimer}
        >
            {/* Subtle brand-tinted top bar */}
            <div
                className="absolute left-0 top-0 h-1.5 w-full"
                style={{ background: `linear-gradient(90deg, ${brandTheme.colors.primary} 0%, ${AMBER} 100%)` }}
            />

            {/* Header — logo or brand name */}
            <div className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-3">
                {step !== 'welcome' && (brandTheme.logoUrl ? (
                    <div className="rounded-2xl bg-white px-3 py-1.5 shadow-sm border border-gray-100">
                        <img
                            src={brandTheme.logoUrl}
                            alt={`${brandName} logo`}
                            className="h-9 w-auto max-w-[160px] object-contain"
                        />
                    </div>
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
                                            ? AMBER
                                            : '#d1d5db',
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
                            <div className="rounded-3xl bg-white p-4 shadow-md border border-gray-100">
                                <img
                                    src={brandTheme.logoUrl}
                                    alt={`${brandName} logo`}
                                    className="h-24 w-auto max-w-[260px] object-contain sm:h-32"
                                />
                            </div>
                        ) : (
                            <div className="text-6xl sm:text-8xl">🍃</div>
                        )}
                        <div>
                            <h1 className="mb-3 text-3xl font-black text-gray-900 sm:text-5xl">Welcome to {brandName}</h1>
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
                                    <div className="text-sm font-bold text-gray-900">{item.label}</div>
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
                                            <Star key={s} className={`h-4 w-4 ${s <= Math.round(reviewStats.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                                        ))}
                                    </div>
                                    <span className="text-sm text-gray-900 font-bold">{reviewStats.avgRating.toFixed(1)}</span>
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
                            onClick={() => setStep('phone')}
                            className="flex w-full items-center justify-center gap-3 rounded-[28px] px-8 py-5 text-xl font-bold transition-all hover:opacity-95 active:scale-[0.99] sm:text-2xl sm:py-6"
                            style={primaryButtonStyle}
                        >
                            Welcome to Thrive! <ArrowRight className="h-7 w-7" />
                        </button>
                        <button
                            onClick={() => { setQuickDigits(''); setQuickMatches([]); setStep('quick_lookup'); }}
                            className="flex w-full items-center justify-center gap-2 rounded-[28px] py-4 text-base font-semibold border transition-all hover:opacity-95"
                            style={secondaryButtonStyle}
                        >
                            Returning member? Quick check-in →
                        </button>
                        <p className="text-sm" style={{ color: faintTextColor }}>Tap to begin</p>
                    </motion.div>
                )}

                {/* ── QUICK LOOKUP ── */}
                {step === 'quick_lookup' && (
                    <motion.div
                        key="quick_lookup"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 mx-auto flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-3xl" style={{ backgroundColor: hexToRgba(AMBER, 0.1) }}>
                                ⚡
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-black text-gray-900">Quick Check-In</h2>
                            <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>
                                Enter the last 4 digits of your phone number
                            </p>
                        </div>

                        {quickMatches.length > 1 ? (
                            <div className="w-full space-y-3">
                                <p className="text-center text-sm font-medium" style={{ color: mutedTextColor }}>Which one are you?</p>
                                {quickMatches.map(m => (
                                    <button
                                        key={m.customerId}
                                        onClick={() => handleQuickMatchSelect(m)}
                                        className="w-full flex items-center justify-between rounded-[24px] border p-5 transition-all hover:opacity-95"
                                        style={panelStyle}
                                    >
                                        <span className="text-xl font-bold text-gray-900">{m.firstName}</span>
                                        <span className="text-sm font-medium" style={{ color: brandTheme.colors.primary }}>···{m.phoneLast4}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="w-full space-y-4">
                                <input
                                    type="tel"
                                    placeholder="_ _ _ _"
                                    value={quickDigits}
                                    onChange={e => {
                                        const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setQuickDigits(d);
                                        resetIdleTimer();
                                        if (d.length === 4) void handleQuickLookup(d);
                                    }}
                                    className={`${INPUT_CLASS} text-center tracking-[0.5em] text-3xl`}
                                    style={inputStyle}
                                    inputMode="numeric"
                                    maxLength={4}
                                    autoFocus
                                />
                                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                                <button
                                    onClick={() => { void handleQuickLookup(); }}
                                    disabled={quickDigits.length !== 4 || quickLookupLoading}
                                    className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                                    style={primaryButtonStyle}
                                >
                                    {quickLookupLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <>Find Me <ArrowRight className="h-7 w-7" /></>
                                    )}
                                </button>
                            </div>
                        )}
                        <button onClick={() => { setError(''); resetToWelcome(); }} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── PHONE (step 1) ── */}
                {step === 'phone' && (
                    <motion.div
                        key="phone"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 mx-auto flex flex-col items-center gap-8 w-full max-w-lg"
                    >
                        <div className="text-center">
                            <Phone className="mx-auto mb-4 h-10 w-10 sm:h-14 sm:w-14" style={{ color: brandTheme.colors.primary }} />
                            {isReturningCustomer && firstName ? (
                                <>
                                    <h2 className="text-2xl sm:text-4xl font-black text-gray-900">Welcome back, {firstName}! 👋</h2>
                                    <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>We found your account — tap Continue to jump straight to picks</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-2xl sm:text-4xl font-black text-gray-900">Welcome! What&apos;s your name?</h2>
                                    <p className="mt-2 text-base sm:text-lg" style={{ color: mutedTextColor }}>Your phone number is your loyalty ID</p>
                                </>
                            )}
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
                                                borderColor: item.checked ? brandTheme.colors.primary : '#d1d5db',
                                                backgroundColor: item.checked ? brandTheme.colors.primary : 'transparent',
                                            }}
                                        >
                                            {item.checked && <CheckCircle2 className="h-5 w-5 text-white" />}
                                        </div>
                                        <span className="text-lg text-gray-900 text-left">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="px-4 text-center text-xs" style={{ color: faintTextColor }}>
                                Msg &amp; data rates may apply. Opt out anytime.
                            </p>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button
                            onClick={handlePhoneSubmit}
                            disabled={!firstName.trim() || phone.replace(/\D/g, '').length < 10}
                            className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
                            style={primaryButtonStyle}
                        >
                            {isReturningCustomer ? 'Find My Picks' : 'Continue'} <ArrowRight className="h-7 w-7" />
                        </button>
                        <button onClick={() => { setError(''); resetToWelcome(); }} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── OFFER (step 2 — personalization + deal) ── */}
                {step === 'offer' && (
                    <motion.div
                        key="offer"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 mx-auto flex flex-col items-center gap-6 w-full max-w-lg"
                    >
                        {/* Deal card */}
                        {offerLoading ? (
                            <div className="w-full rounded-[28px] border p-6 flex items-center gap-4" style={accentPanelStyle}>
                                <Loader2 className="h-8 w-8 animate-spin shrink-0" style={{ color: AMBER }} />
                                <p className="text-lg font-bold text-gray-900">Finding a deal for you...</p>
                            </div>
                        ) : tabletOffer ? (
                            <div
                                className="w-full rounded-[28px] border-2 p-5 transition-all cursor-pointer"
                                style={offerClaimed ? accentPanelStyle : { ...panelStyle, borderColor: AMBER }}
                                onClick={() => { setOfferClaimed(!offerClaimed); resetIdleTimer(); }}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">🔥</span>
                                    <span className="text-sm font-black uppercase tracking-widest" style={{ color: AMBER_DARK }}>
                                        Today&apos;s Special — {firstName ? `Just for you, ${firstName}!` : 'Members Only'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {tabletOffer.imageUrl && (
                                        <img
                                            src={tabletOffer.imageUrl}
                                            alt={tabletOffer.name}
                                            className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-gray-100"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-lg font-black text-gray-900 leading-tight truncate">{tabletOffer.name}</p>
                                        <p className="text-sm mt-0.5" style={{ color: mutedTextColor }}>{tabletOffer.reason}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-2xl font-black" style={{ color: brandTheme.colors.primary }}>${tabletOffer.dealPrice.toFixed(2)}</span>
                                            <span className="text-base line-through" style={{ color: faintTextColor }}>${tabletOffer.originalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                                        style={{
                                            borderColor: offerClaimed ? brandTheme.colors.primary : AMBER,
                                            backgroundColor: offerClaimed ? brandTheme.colors.primary : 'transparent',
                                        }}
                                    >
                                        {offerClaimed && <CheckCircle2 className="h-5 w-5 text-white" />}
                                    </div>
                                </div>
                                <p className="text-xs mt-3 text-center font-medium" style={{ color: offerClaimed ? brandTheme.colors.primary : faintTextColor }}>
                                    {offerClaimed ? '✓ Deal claimed — ask your budtender!' : 'Tap to claim this deal'}
                                </p>
                            </div>
                        ) : null}

                        {/* Birthday field */}
                        <div className="w-full">
                            <label className="block text-sm font-semibold mb-2" style={{ color: mutedTextColor }}>
                                🎂 Birthday (optional — earn a free reward!)
                            </label>
                            <input
                                type="text"
                                placeholder="MM/DD"
                                value={birthday}
                                onChange={e => {
                                    let v = e.target.value.replace(/[^\d/]/g, '').slice(0, 5);
                                    if (v.length === 2 && !v.includes('/')) v = v + '/';
                                    setBirthday(v);
                                    resetIdleTimer();
                                }}
                                className={INPUT_CLASS}
                                style={inputStyle}
                                inputMode="numeric"
                                maxLength={5}
                            />
                        </div>

                        {/* Visit preference tags */}
                        <div className="w-full">
                            <p className="text-sm font-semibold mb-3" style={{ color: mutedTextColor }}>What describes you best? (optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'first-timer', label: '🌱 First-Timer', sub: 'New to cannabis' },
                                    { id: 'recreational', label: '😎 Recreational', sub: 'For fun & social' },
                                    { id: 'medical', label: '💊 Medical', sub: 'For wellness' },
                                    { id: 'regular', label: '⭐ Regular', sub: 'I know what I like' },
                                ].map(pref => (
                                    <button
                                        key={pref.id}
                                        onClick={() => toggleVisitPreference(pref.id)}
                                        className="flex flex-col items-start rounded-[20px] border-2 p-4 text-left transition-all hover:opacity-95"
                                        style={visitPreferences.includes(pref.id) ? accentPanelStyle : panelStyle}
                                    >
                                        <span className="text-base font-bold text-gray-900">{pref.label}</span>
                                        <span className="text-xs mt-0.5" style={{ color: mutedTextColor }}>{pref.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email opt-in */}
                        <div className="w-full space-y-3">
                            <input
                                type="email"
                                placeholder="Email for deals (optional)"
                                value={email}
                                onChange={e => { setEmail(e.target.value); resetIdleTimer(); }}
                                className={INPUT_CLASS}
                                style={inputStyle}
                                inputMode="email"
                                autoComplete="email"
                            />
                            {email.includes('@') && (
                                <button
                                    onClick={() => { setEmailConsent(!emailConsent); resetIdleTimer(); }}
                                    className="flex w-full items-center gap-4 rounded-[24px] border-2 p-4 transition-all"
                                    style={emailConsent ? accentPanelStyle : panelStyle}
                                >
                                    <div
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                                        style={{
                                            borderColor: emailConsent ? brandTheme.colors.primary : '#d1d5db',
                                            backgroundColor: emailConsent ? brandTheme.colors.primary : 'transparent',
                                        }}
                                    >
                                        {emailConsent && <CheckCircle2 className="h-5 w-5 text-white" />}
                                    </div>
                                    <span className="text-base text-gray-900 text-left">Yes, email me weekly deals &amp; bundles</span>
                                </button>
                            )}
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <button
                            onClick={handleOfferSubmit}
                            className="flex w-full items-center justify-center gap-3 rounded-[28px] py-6 text-2xl font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                            style={primaryButtonStyle}
                        >
                            {offerClaimed ? 'Claim & Find My Picks' : 'Continue'} <ArrowRight className="h-7 w-7" />
                        </button>
                        <button
                            onClick={handleOfferSubmit}
                            className="text-sm hover:opacity-70"
                            style={{ color: faintTextColor }}
                        >
                            Skip for now →
                        </button>
                        <button onClick={() => { setError(''); setStep('phone'); }} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── MOOD ── */}
                {step === 'mood' && (
                    <motion.div
                        key="mood"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 mx-auto flex flex-col items-center gap-8 w-full max-w-2xl"
                    >
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-4xl font-black text-gray-900">
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
                                    <span className="text-sm sm:text-xl font-bold text-gray-900 leading-tight">{mood.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handleSubmit()}
                            disabled={loading}
                            className="text-sm hover:opacity-70 disabled:opacity-40"
                            style={{ color: faintTextColor }}
                        >
                            {loading ? 'Saving...' : 'Skip for now'}
                        </button>
                        <button onClick={() => setStep('offer')} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Back</button>
                    </motion.div>
                )}

                {/* ── RECOMMENDATIONS ── */}
                {step === 'recommendations' && (
                    <motion.div
                        key="recommendations"
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.25 }}
                        className="relative z-10 mx-auto flex flex-col items-center gap-5 w-full max-w-4xl"
                    >
                        {recsLoading ? (
                            /* ── Loading: Smokey pulse ── */
                            <div className="flex flex-col items-center gap-6 py-8 sm:py-12">
                                <div className="relative flex items-center justify-center">
                                    <div className="absolute h-40 w-40 rounded-full animate-ping opacity-20" style={{ backgroundColor: brandTheme.colors.primary }} />
                                    <div className="absolute h-32 w-32 rounded-full animate-pulse opacity-30" style={{ backgroundColor: brandTheme.colors.primary }} />
                                    <img
                                        src="/assets/agents/smokey-main.png"
                                        alt="Smokey the AI Budtender"
                                        className="relative h-28 w-28 rounded-full object-cover border-4 shadow-xl"
                                        style={{ borderColor: brandTheme.colors.primary }}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                        Smokey is finding your perfect match...
                                    </p>
                                    <p className="mt-2" style={{ color: mutedTextColor }}>
                                        {selectedMoodDef?.emoji} {selectedMoodDef?.label}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* ── Budtender context strip ── */}
                                {budtenderContext && (
                                    <div className="w-full rounded-[24px] border p-4" style={panelStyle}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="h-4 w-4 shrink-0" style={{ color: brandTheme.colors.primary }} />
                                            <span className="text-xs font-black uppercase tracking-widest" style={{ color: brandTheme.colors.primary }}>
                                                For your budtender{budtenderName ? ` — ${budtenderName}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {budtenderContext.visitCount > 0 && (
                                                <span className="rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hexToRgba(brandTheme.colors.primary, 0.08), color: brandTheme.colors.primary }}>
                                                    {budtenderContext.visitCount} visit{budtenderContext.visitCount !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {budtenderContext.lastVisitLabel && (
                                                <span className="rounded-full px-3 py-1 font-medium bg-gray-100 text-gray-600">
                                                    Last: {budtenderContext.lastVisitLabel}
                                                </span>
                                            )}
                                            {budtenderContext.loyaltyPoints > 0 && (
                                                <span className="rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hexToRgba(AMBER, 0.12), color: AMBER_DARK }}>
                                                    ⭐ {budtenderContext.loyaltyPoints} pts
                                                </span>
                                            )}
                                            {budtenderContext.topCategories.slice(0, 3).map(cat => (
                                                <span key={cat} className="rounded-full px-3 py-1 font-medium bg-gray-100 text-gray-700 capitalize">
                                                    {cat}
                                                </span>
                                            ))}
                                            {budtenderContext.badges.slice(0, 2).map(badge => (
                                                <span key={badge} className="rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hexToRgba(AMBER, 0.12), color: AMBER_DARK }}>
                                                    🏅 {badge}
                                                </span>
                                            ))}
                                        </div>
                                        {budtenderContext.historySummary && (
                                            <p className="mt-2 text-xs leading-relaxed line-clamp-2" style={{ color: mutedTextColor }}>
                                                {budtenderContext.historySummary}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* ── Budtender name field (first time / new customer) ── */}
                                {!budtenderContext && (
                                    <div className="w-full flex items-center gap-3 rounded-[20px] border px-4 py-2" style={panelStyle}>
                                        <Users className="h-4 w-4 shrink-0" style={{ color: mutedTextColor }} />
                                        <input
                                            type="text"
                                            placeholder="Budtender on duty (optional)"
                                            value={budtenderName}
                                            onChange={e => { setBudtenderName(e.target.value); resetIdleTimer(); }}
                                            className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {/* ── Smokey mascot — centered hero ── */}
                                <div className="flex flex-col items-center gap-3 w-full">
                                    {/* Pulsing mascot */}
                                    <div className="relative flex items-center justify-center my-2">
                                        {/* Outer pulse — active when speaking or recording */}
                                        {(voiceOutput.isSpeaking || micIsActive || micIsProcessing) && (
                                            <>
                                                <div className="absolute h-52 w-52 rounded-full animate-ping opacity-10" style={{ backgroundColor: brandTheme.colors.primary }} />
                                                <div className="absolute h-44 w-44 rounded-full animate-pulse opacity-20" style={{ backgroundColor: brandTheme.colors.primary }} />
                                            </>
                                        )}
                                        <div
                                            className="absolute h-36 w-36 rounded-full transition-opacity duration-300"
                                            style={{
                                                backgroundColor: hexToRgba(brandTheme.colors.primary, voiceOutput.isSpeaking || micIsActive ? 0.12 : 0.04),
                                            }}
                                        />
                                        <img
                                            src="/assets/agents/smokey-main.png"
                                            alt="Smokey the AI Budtender"
                                            className="relative h-28 w-28 object-contain drop-shadow-xl"
                                        />
                                    </div>

                                    {/* Smokey speech bubble */}
                                    <div className="relative max-w-sm w-full">
                                        {/* Triangle pointer up to mascot */}
                                        <div
                                            className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0"
                                            style={{
                                                borderLeft: '12px solid transparent',
                                                borderRight: '12px solid transparent',
                                                borderBottom: `12px solid ${hexToRgba(AMBER, 0.2)}`,
                                            }}
                                        />
                                        <div
                                            className="rounded-[22px] border-2 p-4 text-center min-h-[64px] flex items-center justify-center"
                                            style={accentPanelStyle}
                                        >
                                            {micIsActive && (
                                                <p className="text-sm font-semibold animate-pulse" style={{ color: brandTheme.colors.primary }}>
                                                    Listening... release to send.
                                                </p>
                                            )}
                                            {micIsProcessing && (
                                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Smokey is thinking...
                                                </p>
                                            )}
                                            {!micIsActive && !micIsProcessing && assistantSummary && (
                                                <p className="text-sm font-medium text-gray-900 leading-relaxed">{assistantSummary}</p>
                                            )}
                                            {!micIsActive && !micIsProcessing && !assistantSummary && (
                                                <p className="text-sm" style={{ color: mutedTextColor }}>
                                                    {selectedMoodDef?.emoji} Ready to help with <span className="font-bold text-gray-900">{selectedMoodDef?.label}</span>
                                                </p>
                                            )}
                                            {!micIsActive && !micIsProcessing && (assistantError || smokeyVoice.error) && (
                                                <p className="text-sm text-red-500">{assistantError || smokeyVoice.error}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mic + search row */}
                                    <div className="flex w-full gap-3 items-center">
                                        {/* Hold-to-talk mic — always prominent */}
                                        <button
                                            onPointerDown={handleMicPointerDown}
                                            onPointerUp={handleMicPointerUp}
                                            onPointerLeave={handleMicPointerUp}
                                            disabled={micIsProcessing}
                                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition-all select-none disabled:opacity-60 shadow-md"
                                            style={micIsActive
                                                ? { backgroundColor: brandTheme.colors.primary, borderColor: brandTheme.colors.primary, color: '#ffffff' }
                                                : micIsProcessing
                                                    ? { ...secondaryButtonStyle, opacity: 0.6 }
                                                    : { ...secondaryButtonStyle, borderWidth: '2px' }
                                            }
                                            title="Hold to speak to Smokey"
                                        >
                                            {micIsProcessing ? (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            ) : micIsActive ? (
                                                <MicOff className="h-6 w-6 animate-pulse" />
                                            ) : (
                                                <Mic className="h-6 w-6" />
                                            )}
                                        </button>

                                        {/* Search input */}
                                        <div className="flex flex-1 items-center gap-2 rounded-[20px] border px-3 py-3 bg-white">
                                            <Search className="h-5 w-5 shrink-0" style={{ color: brandTheme.colors.primary }} />
                                            <input
                                                type="text"
                                                value={assistantQuery}
                                                onChange={(event) => { setAssistantQuery(event.target.value); resetIdleTimer(); }}
                                                placeholder={ASK_SMOKEY_PLACEHOLDER}
                                                className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                                            />
                                        </div>

                                        <button
                                            onClick={() => { void handleAssistantSearch(); }}
                                            disabled={assistantLoading || assistantQuery.trim().length < 3}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-[20px] px-4 py-3 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40 shrink-0"
                                            style={primaryButtonStyle}
                                        >
                                            {assistantLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <><Sparkles className="h-4 w-4" /> Ask</>
                                            )}
                                        </button>

                                        {/* Voice toggle */}
                                        <button
                                            onClick={handleVoiceToggle}
                                            disabled={!voiceOutput.isSupported}
                                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-all hover:opacity-95 disabled:opacity-40"
                                            style={secondaryButtonStyle}
                                            title={voiceOutput.isEnabled ? 'Turn voice off' : 'Turn voice on'}
                                        >
                                            {voiceOutput.isEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* ── Product cards ── */}
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
                                                    style={{ borderColor: '#e5e7eb' }}
                                                >
                                                    <img
                                                        src={product.imageUrl || SMOKEY_FALLBACK_IMAGE}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover"
                                                        onError={handleProductImageError}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-lg font-bold text-gray-900 sm:text-xl">{product.name}</p>
                                                    <p className="mt-1 truncate text-sm font-medium" style={{ color: brandTheme.colors.primary }}>
                                                        {product.category}{product.brandName ? ` - ${product.brandName}` : ''}
                                                    </p>
                                                    <p className="mt-2 text-sm leading-relaxed" style={{ color: mutedTextColor }}>{product.reason}</p>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                                                    <p className="text-2xl font-black text-gray-900">${product.price.toFixed(2)}</p>
                                                    <button
                                                        onClick={() => toggleCart(product.productId)}
                                                        className="rounded-[18px] px-4 py-2 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                                                        style={inCart ? secondaryButtonStyle : primaryButtonStyle}
                                                    >
                                                        {inCart ? 'Added ✓' : '+ Add'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* ── Bundle ── */}
                                {bundle && (
                                    <div className="w-full rounded-[30px] border p-5 transition-all sm:p-6" style={bundleAdded ? accentPanelStyle : panelStyle}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Star className="h-5 w-5" style={{ color: AMBER }} />
                                                    <span className="text-sm font-bold uppercase tracking-wide" style={{ color: AMBER_DARK }}>Bundle Pick</span>
                                                </div>
                                                <p className="text-xl font-black text-gray-900">{bundle.name}</p>
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
                                                <p className="text-2xl font-black text-gray-900">${bundle.totalPrice.toFixed(2)}</p>
                                                <button
                                                    onClick={() => { setBundleAdded(!bundleAdded); resetIdleTimer(); }}
                                                    className="mt-2 rounded-[18px] border px-4 py-2 text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]"
                                                    style={bundleAdded ? primaryButtonStyle : secondaryButtonStyle}
                                                >
                                                    {bundleAdded ? 'Added Bundle ✓' : '+ Add Bundle'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── CTA ── */}
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

                                {error && <p className="text-center text-sm text-red-500">{error}</p>}
                                <button onClick={() => setStep('mood')} className="text-sm hover:opacity-70" style={{ color: faintTextColor }}>&larr; Change feeling</button>
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
                        className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-8 text-center"
                    >
                        {/* Smokey farewell mascot */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 180 }}
                            className="relative flex items-center justify-center"
                        >
                            <div className="absolute h-44 w-44 rounded-full opacity-10" style={{ backgroundColor: brandTheme.colors.primary }} />
                            <img
                                src="/assets/agents/smokey-main.png"
                                alt="Smokey"
                                className="relative h-32 w-32 object-contain drop-shadow-xl"
                            />
                        </motion.div>

                        <div>
                            <h1 className="mb-3 text-3xl font-black text-gray-900 sm:text-5xl">
                                {firstName
                                    ? `See you next time, ${firstName}!`
                                    : result?.isNewLead
                                        ? 'You\'re all checked in!'
                                        : 'Welcome back!'}
                            </h1>
                            <p className="text-base sm:text-xl" style={{ color: mutedTextColor }}>
                                {budtenderName
                                    ? `${budtenderName} has your picks ready — enjoy!`
                                    : result?.isNewLead
                                        ? 'Your follow-ups are set if you opted in.'
                                        : 'Your loyalty balance is ready.'}
                            </p>
                        </div>

                        {result && result.loyaltyPoints > 0 && (
                            <div className="flex items-center gap-4 rounded-[28px] border px-8 py-5" style={accentPanelStyle}>
                                <Star className="h-10 w-10" style={{ color: AMBER }} />
                                <div className="text-left">
                                    <div className="text-3xl font-black text-gray-900">{result.loyaltyPoints} pts</div>
                                    <div className="text-sm" style={{ color: mutedTextColor }}>Your loyalty balance</div>
                                </div>
                            </div>
                        )}

                        {result && result.queuePosition !== undefined && result.queuePosition > 0 && (
                            <div className="flex items-center gap-4 rounded-[28px] border px-8 py-5" style={panelStyle}>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black" style={{ backgroundColor: hexToRgba(AMBER, 0.12), color: AMBER_DARK }}>
                                    {result.queuePosition}
                                </div>
                                <div className="text-left">
                                    <div className="text-lg font-bold text-gray-900">
                                        {result.queuePosition === 1 ? '1 customer ahead' : `${result.queuePosition} customers ahead`}
                                    </div>
                                    <div className="text-sm" style={{ color: mutedTextColor }}>A budtender will be right with you</div>
                                </div>
                            </div>
                        )}

                        {cartCount > 0 && (
                            <div className="flex items-center gap-3 rounded-[28px] border px-8 py-4" style={panelStyle}>
                                <ShoppingCart className="h-8 w-8" style={{ color: brandTheme.colors.primary }} />
                                <p className="font-bold text-gray-900">
                                    {cartCount} item{cartCount !== 1 ? 's' : ''} selected — show your budtender!
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
