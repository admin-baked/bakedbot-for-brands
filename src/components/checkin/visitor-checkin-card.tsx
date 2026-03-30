'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, MessageSquareText, Mic, Sparkles, Star } from 'lucide-react';
import Chatbot from '@/components/chatbot';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    captureVisitorCheckin,
    getVisitorCheckinContext,
    type VisitorCheckinContextResult,
    type VisitorFavoriteCategory,
} from '@/server/actions/visitor-checkin';
import {
    getMoodRecommendations,
} from '@/server/actions/loyalty-tablet';
import {
    TABLET_MOODS,
    getTabletMoodById,
    type TabletMoodId,
    type TabletBundle,
    type TabletProduct,
} from '@/lib/checkin/loyalty-tablet-shared';

const FAVORITE_CATEGORY_OPTIONS: VisitorFavoriteCategory[] = [
    'flower',
    'pre-rolls',
    'vapes',
    'edibles',
    'concentrates',
    'tinctures',
];

type Step = 'contact' | 'utility' | 'success';

interface VisitorCheckinCardProps {
    orgId: string;
    brandName: string;
    brandSlug: string;
    primaryColor: string;
}

interface SubmissionState {
    firstName: string;
    isReturningCustomer: boolean;
    isNewLead: boolean;
    usedEmail: boolean;
    offerType: 'email' | 'favorite_categories' | null;
}

const EMPTY_CONTEXT: VisitorCheckinContextResult = {
    success: true,
    isReturningCustomer: false,
    enrichmentMode: 'email',
};

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    }).format(value || 0);
}

function titleCaseCategory(value: VisitorFavoriteCategory): string {
    return value
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function VisitorCheckinCard({
    orgId,
    brandName,
    brandSlug,
    primaryColor,
}: VisitorCheckinCardProps) {
    const [step, setStep] = useState<Step>('contact');
    const [firstName, setFirstName] = useState('');
    const [phone, setPhone] = useState('');
    const [idChecked, setIdChecked] = useState(false);
    const [context, setContext] = useState<VisitorCheckinContextResult>(EMPTY_CONTEXT);
    const [email, setEmail] = useState('');
    const [selectedMood, setSelectedMood] = useState<TabletMoodId | null>(null);
    const [recommendationProducts, setRecommendationProducts] = useState<TabletProduct[]>([]);
    const [recommendationBundle, setRecommendationBundle] = useState<TabletBundle | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [bundleAdded, setBundleAdded] = useState(false);
    const [favoriteCategories, setFavoriteCategories] = useState<VisitorFavoriteCategory[]>([]);
    const [loadingContext, setLoadingContext] = useState(false);
    const [loadingRecommendations, setLoadingRecommendations] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submission, setSubmission] = useState<SubmissionState | null>(null);

    const savedEmail = context.savedEmail || '';
    const savedEmailConsent = context.savedEmailConsent === true;
    const enrichmentMode = context.enrichmentMode || 'email';
    const trimmedEmail = email.trim().toLowerCase();
    const usingSavedEmail = enrichmentMode === 'favorite_categories' && Boolean(savedEmail);
    const selectedMoodLabel = useMemo(
        () => getTabletMoodById(selectedMood)?.label || null,
        [selectedMood],
    );

    const resetMessages = () => {
        setError('');
        setSubmission(null);
    };

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds((current) => (
            current.includes(productId)
                ? current.filter((value) => value !== productId)
                : [...current, productId]
        ));
    };

    const toggleFavoriteCategory = (category: VisitorFavoriteCategory) => {
        setFavoriteCategories((current) => (
            current.includes(category)
                ? current.filter((value) => value !== category)
                : [...current, category]
        ));
    };

    const handleContinue = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        resetMessages();

        const trimmedFirstName = firstName.trim();
        const phoneDigits = phone.replace(/\D/g, '');

        if (!trimmedFirstName) {
            setError('First name is required.');
            return;
        }

        if (phoneDigits.length !== 10) {
            setError('Phone is required.');
            return;
        }

        if (!idChecked) {
            setError('Please confirm that a Thrive staff member checked your ID.');
            return;
        }

        setLoadingContext(true);
        try {
            const result = await getVisitorCheckinContext({
                orgId,
                phone,
            });

            if (result.success) {
                setContext(result);
            } else {
                setContext(EMPTY_CONTEXT);
            }
            setStep('utility');
        } catch (_error) {
            setContext(EMPTY_CONTEXT);
            setStep('utility');
        } finally {
            setLoadingContext(false);
        }
    };

    const handleMoodSelect = async (moodId: TabletMoodId) => {
        resetMessages();
        setSelectedMood(moodId);
        setLoadingRecommendations(true);

        try {
            const result = await getMoodRecommendations(orgId, moodId);
            if (!result.success) {
                setRecommendationProducts([]);
                setRecommendationBundle(null);
                setError('Recommendations are loading slowly. Your budtender can still help from the mood you picked.');
                return;
            }

            setRecommendationProducts(result.products ?? []);
            setRecommendationBundle(result.bundle ?? null);
        } catch (_error) {
            setRecommendationProducts([]);
            setRecommendationBundle(null);
            setError('Recommendations are loading slowly. Your budtender can still help from the mood you picked.');
        } finally {
            setLoadingRecommendations(false);
        }
    };

    const handleFinish = async (options?: { skipOffer?: boolean }) => {
        resetMessages();
        const skipOffer = options?.skipOffer === true;
        const finalEmail = usingSavedEmail
            ? (savedEmailConsent ? savedEmail : undefined)
            : (skipOffer ? undefined : (trimmedEmail || undefined));
        const favoriteCategoriesForSubmit = skipOffer || enrichmentMode !== 'favorite_categories'
            ? undefined
            : favoriteCategories;
        const offerType =
            skipOffer
                ? null
                : enrichmentMode === 'email'
                    ? (trimmedEmail ? 'email' : null)
                    : (favoriteCategories.length > 0 ? 'favorite_categories' : null);

        if (!skipOffer && enrichmentMode === 'email' && trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError('Enter a valid email address to unlock the 1c pre-roll offer.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await captureVisitorCheckin({
                orgId,
                firstName: firstName.trim(),
                phone,
                email: finalEmail,
                emailConsent: !usingSavedEmail ? Boolean(finalEmail) : savedEmailConsent,
                smsConsent: true,
                source: 'brand_rewards_checkin',
                ageVerifiedMethod: 'staff_attested_public_flow',
                mood: selectedMood || undefined,
                cartProductIds: selectedProductIds,
                bundleAdded,
                favoriteCategories: favoriteCategoriesForSubmit,
                uiVersion: 'thrive_checkin_v2',
                offerType,
            });

            if (!result.success) {
                setError('Check-in is temporarily unavailable. Staff can still let you in.');
                return;
            }

            setSubmission({
                firstName: firstName.trim(),
                isReturningCustomer: result.isReturningCustomer,
                isNewLead: result.isNewLead,
                usedEmail: Boolean(finalEmail),
                offerType,
            });
            setStep('success');
        } catch (_error) {
            setError('Check-in is temporarily unavailable. Staff can still let you in.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section id="check-in" data-brand-slug={brandSlug} className="scroll-mt-24">
            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6 md:p-8">
                    <div className="mb-6 space-y-2">
                        <p
                            className="text-sm font-semibold uppercase tracking-[0.2em]"
                            style={{ color: primaryColor }}
                        >
                            Front Door Check-In
                        </p>
                        <h2 className="text-3xl font-bold tracking-tight">
                            Check in at {brandName}
                        </h2>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            Tell us your name and number so we can get you in fast, help your budtender,
                            and send weekly deals.
                        </p>
                    </div>
                    {step === 'success' && submission ? (
                        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                                <div className="space-y-2">
                                    <p className="text-2xl font-semibold text-foreground">
                                        {submission.isReturningCustomer
                                            ? `Welcome back, ${submission.firstName}. You're checked in.`
                                            : `You're checked in, ${submission.firstName}.`}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Weekly deals are enabled for this phone number.
                                    </p>
                                    {submission.usedEmail && submission.isNewLead ? (
                                        <p className="text-sm text-muted-foreground">
                                            Your Thrive VIP Rewards welcome email is on the way.
                                        </p>
                                    ) : submission.offerType === 'favorite_categories' ? (
                                        <p className="text-sm text-muted-foreground">
                                            We saved your shopping preferences so Smokey and the Thrive team can personalize next time.
                                        </p>
                                    ) : submission.usedEmail ? (
                                        <p className="text-sm text-muted-foreground">
                                            We saved your email so future recommendations can be more personal.
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            You can always add more details next time to unlock the 1c pre-roll offer.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : step === 'contact' ? (
                        <form className="space-y-5" onSubmit={handleContinue}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="visitor-checkin-first-name">First name</Label>
                                    <Input
                                        id="visitor-checkin-first-name"
                                        value={firstName}
                                        onChange={(event) => {
                                            resetMessages();
                                            setFirstName(event.target.value);
                                        }}
                                        placeholder="Jane"
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="visitor-checkin-phone">Phone number</Label>
                                    <Input
                                        id="visitor-checkin-phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(event) => {
                                            resetMessages();
                                            setPhone(formatPhone(event.target.value));
                                        }}
                                        placeholder="(315) 555-1212"
                                        inputMode="tel"
                                        autoComplete="tel"
                                    />
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        By providing your phone number, you agree to receive weekly deals from Thrive Syracuse.
                                        Max 1 text per week. We will only text more if you ask us to.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                                <label className="flex items-start gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={idChecked}
                                        onChange={(event) => {
                                            resetMessages();
                                            setIdChecked(event.target.checked);
                                        }}
                                        className="mt-0.5 h-4 w-4"
                                    />
                                    <span>A Thrive staff member already checked my ID today</span>
                                </label>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full text-base font-semibold"
                                style={{ backgroundColor: primaryColor }}
                                disabled={loadingContext}
                            >
                                {loadingContext ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading Your Check-In
                                    </>
                                ) : 'Continue'}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                                    How do you want to feel today?
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    We will give your budtender a head start and help you find the right products faster.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {TABLET_MOODS.map((mood) => (
                                        <button
                                            key={mood.id}
                                            type="button"
                                            onClick={() => handleMoodSelect(mood.id)}
                                            className={`rounded-full border px-4 py-2 text-sm transition ${
                                                selectedMood === mood.id
                                                    ? 'border-transparent text-white'
                                                    : 'border-border bg-background text-foreground hover:border-foreground/30'
                                            }`}
                                            style={selectedMood === mood.id ? { backgroundColor: primaryColor } : undefined}
                                        >
                                            {mood.label}
                                        </button>
                                    ))}
                                </div>
                                {selectedMoodLabel ? (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        Mood selected: {selectedMoodLabel}
                                    </p>
                                ) : null}
                            </div>

                            {context.isReturningCustomer && context.lastPurchase ? (
                                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                                    <div className="rounded-2xl border border-border/60 bg-background p-5">
                                        <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                                            Last Purchase
                                        </p>
                                        <p className="mt-3 text-lg font-semibold">
                                            Last time you picked up: {context.lastPurchase.primaryItemName}
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {context.lastPurchase.orderDateLabel || 'Recent purchase'} - {context.lastPurchase.itemCount} item(s) - {formatCurrency(context.lastPurchase.total)}
                                        </p>
                                    </div>

                                    {context.googleReviewUrl ? (
                                        <a
                                            href={context.googleReviewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-foreground transition hover:border-amber-400"
                                        >
                                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                                                <Star className="h-4 w-4 fill-current" />
                                                Google Review
                                            </div>
                                            <p className="mt-3 text-lg font-semibold">
                                                Leave a quick review from your last visit
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                If we helped you out last time, this is the fastest way to support the team.
                                            </p>
                                        </a>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="space-y-4 rounded-2xl border border-border/60 bg-background p-5">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                                        Recommendations
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Pick anything that looks good and we will save it for your budtender.
                                    </p>
                                </div>

                                {loadingRecommendations ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Smokey is pulling recommendations now.
                                    </div>
                                ) : recommendationProducts.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-3">
                                        {recommendationProducts.map((product) => {
                                            const isSelected = selectedProductIds.includes(product.productId);
                                            return (
                                                <div key={product.productId} className="rounded-2xl border border-border/60 p-4">
                                                    <p className="font-semibold">{product.name}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {product.category} · {formatCurrency(product.price)}
                                                    </p>
                                                    <p className="mt-3 text-sm text-muted-foreground">
                                                        {product.reason}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant={isSelected ? 'default' : 'outline'}
                                                        className="mt-4 w-full"
                                                        style={isSelected ? { backgroundColor: primaryColor } : undefined}
                                                        onClick={() => toggleProductSelection(product.productId)}
                                                    >
                                                        {isSelected ? 'Saved for budtender' : 'Save for budtender'}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Choose a mood above and we will line up a few quick recommendations here.
                                    </p>
                                )}

                                {recommendationBundle ? (
                                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="font-semibold">{recommendationBundle.name}</p>
                                                <p className="text-sm text-muted-foreground">{recommendationBundle.tagline}</p>
                                                <p className="mt-2 text-sm text-muted-foreground">
                                                    {recommendationBundle.products.map((product) => product.name).join(' + ')}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant={bundleAdded ? 'default' : 'outline'}
                                                style={bundleAdded ? { backgroundColor: primaryColor } : undefined}
                                                onClick={() => setBundleAdded((current) => !current)}
                                            >
                                                {bundleAdded ? 'Bundle saved' : 'Save bundle idea'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="rounded-2xl border border-border/60 bg-background p-5">
                                <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                                    Unlock today&apos;s 1c pre-roll
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {enrichmentMode === 'email'
                                        ? 'Add your email so we can send your Thrive VIP Rewards welcome and personalize future recommendations.'
                                        : 'Tell us what you usually shop for so Smokey and the Thrive team can personalize your future recommendations.'}
                                </p>

                                {enrichmentMode === 'email' ? (
                                    <div className="mt-4 space-y-2">
                                        <Label htmlFor="visitor-checkin-email">Email</Label>
                                        <Input
                                            id="visitor-checkin-email"
                                            type="email"
                                            value={email}
                                            onChange={(event) => {
                                                resetMessages();
                                                setEmail(event.target.value);
                                            }}
                                            placeholder="you@example.com"
                                            inputMode="email"
                                            autoComplete="email"
                                        />
                                    </div>
                                ) : (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {FAVORITE_CATEGORY_OPTIONS.map((category) => {
                                            const isSelected = favoriteCategories.includes(category);
                                            return (
                                                <button
                                                    key={category}
                                                    type="button"
                                                    onClick={() => toggleFavoriteCategory(category)}
                                                    className={`rounded-full border px-4 py-2 text-sm transition ${
                                                        isSelected
                                                            ? 'border-transparent text-white'
                                                            : 'border-border bg-background text-foreground hover:border-foreground/30'
                                                    }`}
                                                    style={isSelected ? { backgroundColor: primaryColor } : undefined}
                                                >
                                                    {titleCaseCategory(category)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl border border-border/60 bg-background p-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: primaryColor }}>
                                        Smokey is available
                                    </p>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                        <MessageSquareText className="h-3.5 w-3.5" />
                                        Text
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                                        <Mic className="h-3.5 w-3.5" />
                                        Voice
                                    </span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Ask Smokey anything before you walk in and use voice if that is faster.
                                </p>
                                <div className="mt-4 overflow-hidden rounded-2xl border border-border/60">
                                    <Chatbot
                                        brandId={orgId}
                                        dispensaryId={orgId}
                                        entityName={brandName}
                                        state="NY"
                                        initialOpen={true}
                                        positionStrategy="relative"
                                        allowVoiceInput={true}
                                        chatbotConfig={{
                                            enabled: true,
                                            botName: 'Smokey',
                                        }}
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-sm text-destructive" role="alert">
                                    {error}
                                </p>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    type="button"
                                    className="flex-1 text-base font-semibold"
                                    style={{ backgroundColor: primaryColor }}
                                    disabled={submitting}
                                    onClick={() => handleFinish()}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Finishing Check-In
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Finish Check-In
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 text-base font-semibold"
                                    disabled={submitting}
                                    onClick={() => handleFinish({ skipOffer: true })}
                                >
                                    Skip extras and check in
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
