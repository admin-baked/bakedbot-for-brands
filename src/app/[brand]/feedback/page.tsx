'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    getPostPurchaseFeedbackContext,
    submitPostPurchaseFeedback,
    type PostPurchaseFeedbackContextResult,
    type SubmitPostPurchaseFeedbackResult,
} from '@/server/actions/post-purchase-feedback';

function brandLabelFromSlug(slug: string): string {
    if (slug === 'thrivesyracuse') {
        return 'Thrive Syracuse';
    }

    return slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function BrandFeedbackPage() {
    const routeParams = useParams<{ brand: string }>();
    const searchParams = useSearchParams();
    const [context, setContext] = useState<PostPurchaseFeedbackContextResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [result, setResult] = useState<SubmitPostPurchaseFeedbackResult | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadContext() {
            const orgId = searchParams.get('orgId') || '';
            const orderId = searchParams.get('orderId') || '';
            const email = searchParams.get('email') || '';

            if (!orgId || !orderId || !email) {
                setContext({ success: false, error: 'Missing feedback link details.' });
                setLoading(false);
                return;
            }

            setLoading(true);
            const nextContext = await getPostPurchaseFeedbackContext({
                orgId,
                orderId,
                email,
            });

            if (!cancelled) {
                setContext(nextContext);
                setLoading(false);
            }
        }

        void loadContext();

        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    const brandName = useMemo(
        () => brandLabelFromSlug(routeParams?.brand || 'thrivesyracuse'),
        [routeParams?.brand],
    );

    const handleSubmit = async () => {
        if (!context?.success || !context.orderId) {
            return;
        }

        const orgId = searchParams.get('orgId') || '';
        const email = searchParams.get('email') || '';

        if (rating < 1 || rating > 5) {
            setError('Please choose a rating before you submit.');
            return;
        }

        setError('');
        setSubmitting(true);
        const submission = await submitPostPurchaseFeedback({
            orgId,
            orderId: context.orderId,
            email,
            rating,
            reviewText,
        });
        setSubmitting(false);

        if (!submission.success) {
            setError(submission.error || 'We could not save your feedback.');
            return;
        }

        setResult(submission);
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fbf8_0%,#ffffff_55%,#f4f6f5_100%)] px-4 py-12">
            <div className="mx-auto max-w-2xl">
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-6 md:p-8">
                        <div className="mb-6 space-y-2 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                                {brandName}
                            </p>
                            <h1 className="text-3xl font-bold tracking-tight">
                                How did you like your purchase?
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Your feedback helps the Thrive team, helps Smokey learn your preferences,
                                and helps purchasing decisions get smarter over time.
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading your purchase details
                            </div>
                        ) : result?.success ? (
                            <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                                <p className="text-2xl font-semibold">Thanks for the feedback.</p>
                                <p className="text-sm text-muted-foreground">
                                    {result.googleReviewEligible
                                        ? 'Want to help the Thrive Syracuse team publicly too?'
                                        : 'We shared your feedback with the team.'}
                                </p>
                                {result.googleReviewEligible && result.googleReviewUrl ? (
                                    <Button asChild className="w-full">
                                        <a href={result.googleReviewUrl} target="_blank" rel="noopener noreferrer">
                                            Leave a Google Review
                                        </a>
                                    </Button>
                                ) : null}
                            </div>
                        ) : !context?.success ? (
                            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center text-sm text-destructive">
                                {context?.error || 'This feedback link is unavailable.'}
                            </div>
                        ) : context.alreadySubmitted ? (
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 text-center">
                                <p className="text-lg font-semibold">We already have your feedback for this purchase.</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Thanks for helping us make future recommendations better.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                        Purchase
                                    </p>
                                    <p className="mt-3 text-lg font-semibold">
                                        {context.primaryItemName || 'Recent order'}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {context.orderDateLabel || 'Recent order'} - {context.itemCount || 0} item(s)
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                        Rating
                                    </p>
                                    <div className="flex justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setRating(value)}
                                                className="rounded-full border border-border p-3 transition hover:border-amber-400"
                                                aria-label={`${value} star`}
                                            >
                                                <Star
                                                    className={`h-6 w-6 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                        Anything else we should know?
                                    </p>
                                    <Textarea
                                        value={reviewText}
                                        onChange={(event) => setReviewText(event.target.value)}
                                        placeholder="Tell us what you liked, what you would try again, or what could have been better."
                                        rows={5}
                                    />
                                </div>

                                {error ? (
                                    <p className="text-sm text-destructive" role="alert">
                                        {error}
                                    </p>
                                ) : null}

                                <Button className="w-full text-base font-semibold" onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving feedback
                                        </>
                                    ) : 'Submit Feedback'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
