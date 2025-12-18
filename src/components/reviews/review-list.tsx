'use client';

/**
 * Review List Component
 * Displays reviews with ratings, tags, and report functionality
 */

import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Review, ReviewAggregate, ReviewEntityType, GetReviewsResponse } from '@/types/reviews';

interface ReviewListProps {
    entityType: ReviewEntityType;
    entityId: string;
    showAggregate?: boolean;
}

export function ReviewList({
    entityType,
    entityId,
    showAggregate = true,
}: ReviewListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [aggregate, setAggregate] = useState<ReviewAggregate | null>(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        async function fetchReviews() {
            try {
                const res = await fetch(
                    `/api/reviews?entityType=${entityType}&entityId=${entityId}&limit=10`
                );
                const data: GetReviewsResponse = await res.json();

                if (data.success) {
                    setReviews(data.reviews);
                    setAggregate(data.aggregate || null);
                    setTotal(data.total);
                }
            } catch (error) {
                console.error('Failed to fetch reviews:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchReviews();
    }, [entityType, entityId]);

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Aggregate Section */}
            {showAggregate && aggregate && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-start gap-6">
                            {/* Average Rating */}
                            <div className="text-center">
                                <div className="text-5xl font-bold">{aggregate.avgRating.toFixed(1)}</div>
                                <div className="flex justify-center mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-4 h-4 ${star <= Math.round(aggregate.avgRating)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-slate-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {aggregate.countTotal} reviews
                                </p>
                                {aggregate.countVerified > 0 && (
                                    <p className="text-xs text-green-600">
                                        {aggregate.countVerified} verified
                                    </p>
                                )}
                            </div>

                            {/* Rating Distribution */}
                            <div className="flex-1 space-y-1">
                                {[5, 4, 3, 2, 1].map((stars) => {
                                    const count = aggregate.ratingDistribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
                                    const percent = aggregate.countTotal > 0
                                        ? (count / aggregate.countTotal) * 100
                                        : 0;
                                    return (
                                        <div key={stars} className="flex items-center gap-2">
                                            <span className="text-sm w-4">{stars}</span>
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            <Progress value={percent} className="h-2 flex-1" />
                                            <span className="text-xs text-muted-foreground w-8">
                                                {count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Tags */}
                        {Object.keys(aggregate.tagHistogram).length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm font-medium mb-2">What people love</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(aggregate.tagHistogram)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 5)
                                        .map(([tag, count]) => (
                                            <Badge key={tag} variant="secondary">
                                                {tag} ({count})
                                            </Badge>
                                        ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No reviews yet. Be the first to leave one!
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                    ))}

                    {total > reviews.length && (
                        <Button variant="outline" className="w-full">
                            Show More Reviews ({total - reviews.length} remaining)
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

function ReviewCard({ review }: { review: Review }) {
    const [helpful, setHelpful] = useState(false);

    const createdAt = review.createdAt instanceof Date
        ? review.createdAt
        : new Date(review.createdAt);

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        {/* Rating Stars */}
                        <div className="flex items-center gap-2">
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-4 h-4 ${star <= review.rating
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-slate-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            {review.verified && (
                                <Badge variant="secondary" className="text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verified
                                </Badge>
                            )}
                        </div>

                        {/* Tags */}
                        {review.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {review.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* Text */}
                        {review.text && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                {review.text}
                            </p>
                        )}
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(createdAt)}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={helpful ? 'text-green-600' : ''}
                        onClick={() => setHelpful(!helpful)}
                    >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        Helpful {helpful && '✓'}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <Flag className="w-4 h-4 mr-1" />
                        Report
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

export default ReviewList;
