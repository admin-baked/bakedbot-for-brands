'use client';

/**
 * Public Review Page
 *
 * Accessible from the post-purchase review nudge email.
 * Uses visitId as verification — no auth required.
 *
 * Usage: /review?orgId=org_thrive_syracuse&visitId=abc123
 */

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Star, CheckCircle2, Loader2 } from 'lucide-react';
import { submitPublicReview } from '@/server/actions/public-review';
import { REVIEW_TAGS } from '@/types/reviews';

const DISPENSARY_TAGS = REVIEW_TAGS.dispensary;

export default function PublicReviewPage() {
    const searchParams = useSearchParams();
    const orgId = searchParams.get('orgId') || '';
    const visitId = searchParams.get('visitId') || '';

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const dispensaryName = orgId === 'org_thrive_syracuse' ? 'Thrive Syracuse' : 'the dispensary';

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a rating');
            return;
        }
        if (!orgId || !visitId) {
            setError('Invalid review link');
            return;
        }

        setSubmitting(true);
        setError('');

        const result = await submitPublicReview({
            orgId,
            visitId,
            rating,
            tags: selectedTags.length > 0 ? selectedTags : undefined,
            text: text.trim() || undefined,
        });

        setSubmitting(false);

        if (result.success) {
            setSubmitted(true);
        } else {
            setError(result.error || 'Failed to submit review');
        }
    };

    if (!orgId || !visitId) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <p className="text-white/60 text-lg">Invalid review link.</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto" />
                    <h1 className="text-3xl font-black text-white">Thank you!</h1>
                    <p className="text-lg text-white/60">
                        Your review helps other customers and means the world to the {dispensaryName} team.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl sm:text-3xl font-black text-white">
                        How was your visit to {dispensaryName}?
                    </h1>
                    <p className="text-white/50 mt-2">
                        Your feedback helps us improve and helps other customers.
                    </p>
                </div>

                {/* Star Rating */}
                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110 active:scale-95"
                        >
                            <Star
                                className={`h-10 w-10 sm:h-12 sm:w-12 transition-colors ${
                                    star <= (hoverRating || rating)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-white/20'
                                }`}
                            />
                        </button>
                    ))}
                </div>

                {/* Tags */}
                <div>
                    <p className="text-sm text-white/50 mb-3">What stood out? (optional)</p>
                    <div className="flex flex-wrap gap-2">
                        {DISPENSARY_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`rounded-full border px-4 py-2 text-sm transition ${
                                    selectedTags.includes(tag)
                                        ? 'border-purple-500 bg-purple-500/20 text-white'
                                        : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Text */}
                <div>
                    <p className="text-sm text-white/50 mb-2">Anything else? (optional)</p>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Tell us about your experience..."
                        maxLength={500}
                        rows={3}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 resize-none"
                    />
                    <p className="text-xs text-white/30 text-right mt-1">{text.length}/500</p>
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                    className="w-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-40 text-white text-lg font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                >
                    {submitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        'Submit Review'
                    )}
                </button>
            </div>
        </div>
    );
}
