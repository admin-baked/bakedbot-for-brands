'use client';

/**
 * Review Form Component
 * Star rating, tags, and text input for first-party reviews
 */

import { useState } from 'react';
import { Star, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ReviewEntityType, CreateReviewResponse } from '@/types/reviews';
import { REVIEW_TAGS } from '@/types/reviews';

interface ReviewFormProps {
    entityType: ReviewEntityType;
    entityId: string;
    entityName: string;
    onSuccess?: (reviewId: string) => void;
    verificationEventId?: string;
}

export function ReviewForm({
    entityType,
    entityId,
    entityName,
    onSuccess,
    verificationEventId,
}: ReviewFormProps) {
    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const availableTags = REVIEW_TAGS[entityType] || [];

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({ title: 'Please select a rating', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entityType,
                    entityId,
                    rating,
                    tags: selectedTags,
                    text: text.trim() || undefined,
                    verificationEventId,
                }),
            });

            const data: CreateReviewResponse = await response.json();

            if (data.success) {
                toast({
                    title: 'Review submitted!',
                    description: data.status === 'approved'
                        ? 'Your review is now live.'
                        : 'Your review is pending moderation.',
                });
                onSuccess?.(data.reviewId!);

                // Reset form
                setRating(0);
                setSelectedTags([]);
                setText('');
            } else {
                toast({ title: data.error || 'Failed to submit review', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Something went wrong', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    Review {entityName}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Star Rating */}
                <div>
                    <p className="text-sm font-medium mb-2">Your Rating</p>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-8 h-8 ${star <= (hoverRating || rating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-slate-300'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <p className="text-sm font-medium mb-2">What made it great? (optional)</p>
                    <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                            <Badge
                                key={tag}
                                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => toggleTag(tag)}
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Text Review */}
                <div>
                    <p className="text-sm font-medium mb-2">Share your experience (optional)</p>
                    <Textarea
                        placeholder="Tell others about your experience..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={3}
                        maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                        {text.length}/500
                    </p>
                </div>

                {/* Submit */}
                <Button
                    onClick={handleSubmit}
                    disabled={rating === 0 || isSubmitting}
                    className="w-full"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit Review
                </Button>

                {verificationEventId && (
                    <p className="text-xs text-green-600 text-center">
                        ✓ Verified purchase
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default ReviewForm;
