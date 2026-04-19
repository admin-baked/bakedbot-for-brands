'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    captureTabletLead,
    getMoodRecommendations,
    searchTabletRecommendations,
    browseTabletCategory,
    quickLookupByPhoneLast4,
    getTabletOffer,
    getCustomerBudtenderContext,
    prefetchTabletInventory,
    precomputeAllMoodRecs,
    getTabletAvailableCategories,
    lookupCustomerByPhone,
    findAlleavesCandidatesByName,
    linkCustomerToAlleaves,
    type QuickLookupResult,
    type AlleavesCandidateMatch,
    type TabletOffer,
    type BudtenderContext,
    type TabletProduct,
    type TabletBundle
} from '@/server/actions/loyalty-tablet';
import { getPublicBrandTheme } from '@/server/actions/checkin-management';
import { getPublicReviews } from '@/server/actions/public-review';
import { 
    TABLET_MOODS, 
    getTabletMoodById, 
    type TabletMoodId 
} from '@/lib/checkin/loyalty-tablet-shared';
import { 
    DEFAULT_PUBLIC_BRAND_THEME, 
    type PublicBrandTheme 
} from '@/lib/checkin/checkin-management-shared';
import { useSmokeyVoice } from '@/hooks/use-smokey-voice';
import { useVoiceOutput } from '@/hooks/use-voice-output';

type Step = 'welcome' | 'quick_lookup' | 'phone' | 'returning_check' | 'returning_candidates' | 'offer' | 'mood' | 'recommendations' | 'success';
const IDLE_TIMEOUT_MS = 60_000;

export function useTabletFlow(orgId: string) {
    const [step, setStep] = useState<Step>('welcome');
    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [emailConsent, setEmailConsent] = useState(false);
    const [smsConsent, setSmsConsent] = useState(false);
    const [intent, setIntent] = useState<'checkin' | 'pickup'>('checkin');

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
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [cart, setCart] = useState<string[]>([]);
    const [bundleAdded, setBundleAdded] = useState(false);

    // Submit state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ isNewLead: boolean; loyaltyPoints: number; queuePosition?: number; visitId?: string } | null>(null);

    const [brandTheme, setBrandTheme] = useState<PublicBrandTheme>(DEFAULT_PUBLIC_BRAND_THEME);
    const [reviews, setReviews] = useState<Array<{ rating: number, text?: string, tags: string[], firstName?: string, createdAt: string }>>([]);
    const [reviewStats, setReviewStats] = useState<{ avgRating: number, totalCount: number }>({ avgRating: 0, totalCount: 0 });

    const [assistantQuery, setAssistantQuery] = useState('');
    const [assistantSummary, setAssistantSummary] = useState('');
    const [assistantError, setAssistantError] = useState('');
    const [assistantLoading, setAssistantLoading] = useState(false);

    // Quick returning-customer lookup state
    const [quickDigits, setQuickDigits] = useState('');
    const [quickLookupLoading, setQuickLookupLoading] = useState(false);
    const [quickMatches, setQuickMatches] = useState<QuickLookupResult['matches']>([]);

    // Category quick-access pills shown during the Smokey loading state
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    // Full-flow returning-customer detection (phone pre-fill + offer skip)
    const [isReturningCustomer, setIsReturningCustomer] = useState(false);
    const [enteredViaQuickLookup, setEnteredViaQuickLookup] = useState(false);

    // "Have you shopped here before?" candidate matching
    const [alleavesCandidates, setAlleavesCandidates] = useState<AlleavesCandidateMatch[]>([]);
    const [candidateLoading, setCandidateLoading] = useState(false);
    const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
    const [isBrave, setIsBrave] = useState(false);

    // Smokey hold-to-talk voice
    const smokeyVoice = useSmokeyVoice({
        orgId,
        customerName: firstName || undefined,
        mood: selectedMood ?? undefined,
        cartItems: cart,
    });

    // TTS for proactive voice guidance
    const voiceOutput = useVoiceOutput();
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Generation counter — incremented each time a new mood rec fetch starts.
    // handleCategoryBrowse bumps it so any in-flight mood rec ignores its result.
    const recsGenRef = useRef(0);

    const resetToWelcome = useCallback(() => {
        smokeyVoice.stopAutoListen();
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
        setVideoUrl(null);
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
        setEnteredViaQuickLookup(false);
        setAlleavesCandidates([]);
        setCandidateLoading(false);
        setAvailableCategories([]);
        setIntent('checkin');
    }, [smokeyVoice, voiceOutput]);

    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (step !== 'welcome' && step !== 'success' && !recsLoading && !loading && !assistantLoading) {
            idleTimer.current = setTimeout(resetToWelcome, IDLE_TIMEOUT_MS);
        }
    }, [step, recsLoading, loading, assistantLoading, resetToWelcome]);

    useEffect(() => {
        const checkBrave = async () => {
            if ((navigator as any).brave && await (navigator as any).brave.isBrave()) {
                setIsBrave(true);
            }
        };
        void checkBrave();
        voiceOutput.setIsEnabled(true);
    }, [voiceOutput]);

    useEffect(() => {
        if (!smokeyVoice.transcript) return;
        setAssistantSummary(smokeyVoice.transcript);
    }, [smokeyVoice.transcript]);

    const handleAssistantSearch = useCallback(async (rawQuery?: string, unlimited?: boolean) => {
        const query = (rawQuery ?? assistantQuery).trim();
        resetIdleTimer();
        if (query.length < 3 && !unlimited) {
            setAssistantError('Tell Smokey a little more so we can narrow the menu down.');
            return;
        }
        setAssistantLoading(true);
        setAssistantError('');
        setError('');
        voiceOutput.stop();
        try {
            const response = await searchTabletRecommendations(orgId, query, selectedMood, customerId, unlimited);
            if (!response.success || !response.products?.length) {
                setAssistantError(response.error || 'Smokey could not narrow the menu down yet.');
                return;
            }
            setProducts(response.products);
            setBundle(response.bundle ?? null);
            setAssistantSummary(response.summary || `Smokey found ${response.products.length} live-menu matches for "${query}".`);
            if (voiceOutput.isEnabled && voiceOutput.isSupported) {
                voiceOutput.speak(response.summary || `I found ${response.products.length} products for ${query}.`);
            }
        } catch (searchError) {
            setAssistantError(searchError instanceof Error ? searchError.message : 'Smokey could not search the live menu right now.');
        } finally {
            setAssistantLoading(false);
        }
    }, [orgId, assistantQuery, selectedMood, customerId, resetIdleTimer, voiceOutput]);

    useEffect(() => {
        if (!smokeyVoice.inputTranscript || smokeyVoice.state !== 'speaking') return;
        setAssistantQuery(smokeyVoice.inputTranscript);
        void handleAssistantSearch(smokeyVoice.inputTranscript);
    }, [smokeyVoice.inputTranscript, smokeyVoice.state, handleAssistantSearch]);

    useEffect(() => {
        let mounted = true;
        void getPublicBrandTheme(orgId).then((theme) => { if (mounted) setBrandTheme(theme); });
        void getPublicReviews(orgId, 3).then((response) => {
            if (!mounted) return;
            setReviews(response.reviews);
            setReviewStats({ avgRating: response.avgRating, totalCount: response.totalCount });
        });
        void fetch(`/api/budtender-shift?orgId=${orgId}&action=active`)
            .then(res => res.json())
            .then(data => {
                if (mounted && data.success && data.budtenders?.length > 0) {
                    setBudtenderName(data.budtenders[0].firstName);
                }
            })
            .catch((err) => { console.warn('[TabletFlow] Failed to fetch budtender shift:', err); });
        return () => { mounted = false; };
    }, [orgId]);

    useEffect(() => {
        resetIdleTimer();
        return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    }, [resetIdleTimer]);

    useEffect(() => {
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
            void getCustomerBudtenderContext(orgId, res.customerId).then(ctx => {
                if (ctx.success && ctx.context) setBudtenderContext(ctx.context);
            });
        });
    }, [orgId, phone, step, isReturningCustomer, customerId, firstName]);

    useEffect(() => {
        if (step !== 'phone' || phone.replace(/\D/g, '').length !== 10 || offerLoading || tabletOffer) return;
        setOfferLoading(true);
        void getTabletOffer(orgId).then(res => {
            if (res.success && res.offer) setTabletOffer(res.offer);
            setOfferLoading(false);
        });
    }, [orgId, phone, step, offerLoading, tabletOffer]);

    // Prefetch inventory and pre-compute all 7 mood recommendations so mood taps return instantly.
    // Fires on welcome (page load) and re-fires on phone/offer/returning_check as a safety net.
    useEffect(() => {
        if (step !== 'welcome' && step !== 'quick_lookup' && step !== 'phone' && step !== 'offer' && step !== 'returning_check') return;
        void prefetchTabletInventory(orgId).then(() => {
            void precomputeAllMoodRecs(orgId);
        });
    }, [orgId, step]);

    const handleQuickLookup = async (digits?: string) => {
        const lookup = digits ?? quickDigits;
        if (lookup.length !== 4) return;
        resetIdleTimer();
        setQuickLookupLoading(true);
        setError('');
        try {
            const result = await quickLookupByPhoneLast4(orgId, lookup);
            if (result.found && result.matches.length === 1) {
                const m = result.matches[0];
                setFirstName(m.firstName);
                setCustomerId(m.customerId);
                setIsReturningCustomer(true);
                setEnteredViaQuickLookup(true);
                void getCustomerBudtenderContext(orgId, m.customerId).then(ctx => {
                    if (ctx.success && ctx.context) setBudtenderContext(ctx.context);
                });
                
                if (intent === 'pickup') {
                    void handleSubmit({ customerId: m.customerId, firstName: m.firstName, isPickup: true });
                } else {
                    setStep('mood');
                }
            } else if (result.found && result.matches.length > 1) {
                setQuickMatches(result.matches);
            } else {
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
        setIsReturningCustomer(true);
        setEnteredViaQuickLookup(true);
        setQuickMatches([]);
        void getCustomerBudtenderContext(orgId, match.customerId).then(res => {
            if (res.success && res.context) setBudtenderContext(res.context);
        });
        
        if (intent === 'pickup') {
            void handleSubmit({ customerId: match.customerId, firstName: match.firstName, isPickup: true });
        } else {
            setStep('mood');
        }
    };

    const handlePhoneSubmit = () => {
        resetIdleTimer();
        setError('');
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        
        if (intent === 'pickup') {
            void handleSubmit({ isPickup: true });
            return;
        }

        if (isReturningCustomer) {
            setStep('mood');
            return;
        }
        // Ask "Have you shopped here before?" before offer
        setStep('returning_check');
    };

    const handleReturningYes = async () => {
        resetIdleTimer();
        setCandidateLoading(true);
        setError('');
        try {
            const result = await findAlleavesCandidatesByName(orgId, firstName);
            if (result.found && result.matches.length > 0) {
                setAlleavesCandidates(result.matches);
                setStep('returning_candidates');
            } else {
                // No matches found — proceed as new customer
                setStep('offer');
            }
        } catch {
            setStep('offer');
        } finally {
            setCandidateLoading(false);
        }
    };

    const handleReturningNo = () => {
        resetIdleTimer();
        if (!tabletOffer && !offerLoading) {
            setOfferLoading(true);
            void getTabletOffer(orgId).then(res => {
                if (res.success && res.offer) setTabletOffer(res.offer);
                setOfferLoading(false);
            });
        }
        setStep('offer');
    };

    const handleCandidateSelect = async (candidate: AlleavesCandidateMatch) => {
        resetIdleTimer();
        setCustomerId(candidate.customerId);
        setIsReturningCustomer(true);
        // Link the Alleaves profile in the background
        if (candidate.alleavesCustomerId) {
            void linkCustomerToAlleaves(orgId, candidate.customerId, candidate.alleavesCustomerId);
        }
        void getCustomerBudtenderContext(orgId, candidate.customerId).then(ctx => {
            if (ctx.success && ctx.context) setBudtenderContext(ctx.context);
        });
        setStep('mood');
    };

    const handleCandidateNone = () => {
        resetIdleTimer();
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
        setVisitPreferences(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]);
    };

    const handleMoodSelect = async (moodId: TabletMoodId) => {
        if (recsLoading || step === 'recommendations') return;
        resetIdleTimer();
        smokeyVoice.cancel();
        smokeyVoice.stopAutoListen();
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
        // Bump generation so any later category browse can ignore this result
        recsGenRef.current += 1;
        const myGen = recsGenRef.current;
        // Fetch categories in background so loading screen shows quick-access pills immediately
        void getTabletAvailableCategories(orgId).then(cats => { if (cats.length) setAvailableCategories(cats); });
        const recsFallbackMsg = 'Could not load recommendations — tap a category below to browse.';
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('timeout')), 15_000);
            });
            const response = await Promise.race([getMoodRecommendations(orgId, moodId), timeoutPromise]);
            // Drop result if a category browse already took over
            if (recsGenRef.current !== myGen) return;
            if (response.success && response.products?.length) {
                setProducts(response.products);
                setBundle(response.bundle ?? null);
                setVideoUrl(response.videoUrl ?? null);
                const moodLabel = getTabletMoodById(moodId)?.label ?? '';
                const greeting = firstName
                    ? `Hey ${firstName}! Here are my top picks for ${moodLabel}.`
                    : `Here are my top picks for ${moodLabel}.`;
                setAssistantSummary(greeting);
                if (voiceOutput.isEnabled && voiceOutput.isSupported) {
                    voiceOutput.speak(greeting);
                }
            } else {
                setError(recsFallbackMsg);
            }
        } catch {
            if (recsGenRef.current === myGen) setError(recsFallbackMsg);
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (recsGenRef.current === myGen) setRecsLoading(false);
        }
    };

    // Called when customer taps a category pill. Bypasses Smokey/LLM for instant results.
    const handleCategoryBrowse = useCallback((category: string) => {
        resetIdleTimer();
        recsGenRef.current += 1;
        const myGen = recsGenRef.current;
        setRecsLoading(false);
        setAssistantLoading(true);
        setAssistantError('');
        void browseTabletCategory(orgId, category).then(res => {
            if (recsGenRef.current !== myGen) return;
            if (res.success && res.products.length) {
                setProducts(res.products);
                setBundle(null);
                setAssistantSummary(`${res.total} ${category} products on the menu.`);
            } else {
                void handleAssistantSearch(category);
            }
        }).catch(() => {
            if (recsGenRef.current === myGen) void handleAssistantSearch(category);
        }).finally(() => {
            if (recsGenRef.current === myGen) setAssistantLoading(false);
        });
    }, [resetIdleTimer, orgId, handleAssistantSearch]);

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
            voiceOutput.speak('Voice guide is on. Ask for something like calming gummies under thirty dollars or a social pre-roll.');
        }
    };

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

    // Toggle auto-listen on/off (mic mute/unmute for tablet)
    const handleAutoListenToggle = () => {
        resetIdleTimer();
        setAssistantError('');
        if (smokeyVoice.autoListening) {
            smokeyVoice.stopAutoListen();
        } else {
            smokeyVoice.startAutoListen();
        }
    };

    const handleRequestMicPermission = async () => {
        resetIdleTimer();
        setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            setMicPermission('granted');
            if (voiceOutput.isEnabled) {
                voiceOutput.speak('Microphone enabled. You can now use voice search.');
            }
        } catch (err) {
            console.warn('[MicPermission] Denied or failed', err);
            setMicPermission('denied');
            if (isBrave) {
                setError('Brave may be blocking the microphone. Check Brave Shields or site settings (lock icon).');
            } else {
                setError('Microphone access was denied. Please enable it in browser settings.');
            }
        }
    };

    const toggleCart = (productId: string) => {
        resetIdleTimer();
        setCart(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
    };

    const handleSubmit = async (overrideArgs?: { customerId?: string; firstName?: string; isPickup?: boolean }) => {
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
                    firstName: overrideArgs?.firstName || firstName,
                    email: email || undefined,
                    phone: phone || undefined,
                    emailConsent,
                    smsConsent,
                    mood: (overrideArgs?.isPickup || intent === 'pickup') ? undefined : (selectedMood ?? undefined),
                    cartProductIds: [...new Set([...cart, ...(bundleAdded && bundle ? bundle.products.map((p: TabletProduct) => p.productId) : [])])],
                    bundleAdded,
                    birthday: birthday || undefined,
                    visitPreferences: (overrideArgs?.isPickup || intent === 'pickup') 
                        ? ['Order Pickup'] 
                        : (visitPreferences.length ? visitPreferences : undefined),
                    offerProductId: offerClaimed && tabletOffer ? tabletOffer.productId : undefined,
                    customerId: overrideArgs?.customerId || customerId || undefined,
                }),
                timeoutPromise,
            ]);
            if (timeoutId) clearTimeout(timeoutId);
            if (res.success) {
                setResult(res as any);
                setStep('success');
                setTimeout(resetToWelcome, 15_000);
            } else {
                setError(res.error || 'Check-in failed - please ask a budtender.');
            }
        } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : 'Check-in failed - please ask a budtender.');
        } finally {
            setLoading(false);
        }
    };

    return {
        step, setStep,
        intent, setIntent,
        firstName, setFirstName,
        phone, setPhone,
        email, setEmail,
        emailConsent, setEmailConsent,
        smsConsent, setSmsConsent,
        birthday, setBirthday,
        visitPreferences, setVisitPreferences,
        tabletOffer, setTabletOffer,
        offerClaimed, setOfferClaimed,
        offerLoading, setOfferLoading,
        customerId, setCustomerId,
        budtenderContext, setBudtenderContext,
        budtenderName, setBudtenderName,
        selectedMood, setSelectedMood,
        recsLoading, setRecsLoading,
        products, setProducts,
        bundle, setBundle,
        videoUrl, setVideoUrl,
        cart, setCart,
        bundleAdded, setBundleAdded,
        loading, setLoading,
        error, setError,
        result, setResult,
        brandTheme, setBrandTheme,
        reviews, setReviews,
        reviewStats, setReviewStats,
        assistantQuery, setAssistantQuery,
        assistantSummary, setAssistantSummary,
        assistantError, setAssistantError,
        assistantLoading, setAssistantLoading,
        quickDigits, setQuickDigits,
        quickLookupLoading, setQuickLookupLoading,
        quickMatches, setQuickMatches,
        isReturningCustomer, setIsReturningCustomer,
        enteredViaQuickLookup, setEnteredViaQuickLookup,
        micPermission, setMicPermission,
        isBrave, setIsBrave,
        smokeyVoice, voiceOutput,
        resetToWelcome, resetIdleTimer,
        handleQuickLookup, handleQuickMatchSelect,
        handlePhoneSubmit, handleOfferSubmit,
        handleReturningYes, handleReturningNo,
        handleCandidateSelect, handleCandidateNone,
        alleavesCandidates, candidateLoading,
        toggleVisitPreference, handleMoodSelect,
        handleAssistantSearch, handleVoiceToggle,
        handleMicPointerDown, handleMicPointerUp, handleAutoListenToggle,
        handleRequestMicPermission, toggleCart, handleSubmit,
        availableCategories, handleCategoryBrowse
    };
}
