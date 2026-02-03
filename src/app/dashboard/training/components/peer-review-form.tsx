/**
 * Peer Review Form Component
 *
 * Allow interns to review other's code with rubric scoring.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Star, Info } from 'lucide-react';
import { submitPeerReview } from '@/server/actions/peer-review';
import { useToast } from '@/hooks/use-toast';
import type { PeerReview, RubricScore } from '@/types/training';

interface PeerReviewFormProps {
    review: PeerReview;
    submissionCode: string;
    challengeTitle: string;
}

const RUBRIC_CATEGORIES = [
    {
        name: 'Code Quality',
        description: 'Clean, readable code with good structure',
    },
    {
        name: 'TypeScript Usage',
        description: 'Strong typing, proper interfaces, no any',
    },
    {
        name: 'BakedBot Standards',
        description: 'Follows CLAUDE.md patterns and conventions',
    },
    {
        name: 'Problem Solving',
        description: 'Correct solution with edge case handling',
    },
    {
        name: 'Best Practices',
        description: 'DRY, KISS, proper documentation',
    },
];

export function PeerReviewForm({ review, submissionCode, challengeTitle }: PeerReviewFormProps) {
    const [rating, setRating] = useState<number>(3);
    const [strengths, setStrengths] = useState<string>('');
    const [improvements, setImprovements] = useState<string>('');
    const [questions, setQuestions] = useState<string>('');
    const [wouldApprove, setWouldApprove] = useState<boolean | null>(null);
    const [rubricScores, setRubricScores] = useState<Record<string, number>>(
        Object.fromEntries(RUBRIC_CATEGORIES.map((c) => [c.name, 3]))
    );
    const [rubricComments, setRubricComments] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startTime] = useState(Date.now());

    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (strengths.trim().length < 20) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Review',
                description: 'Please provide more detailed strengths (at least 20 characters)',
            });
            return;
        }

        if (improvements.trim().length < 20) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Review',
                description: 'Please provide more detailed improvements (at least 20 characters)',
            });
            return;
        }

        if (wouldApprove === null) {
            toast({
                variant: 'destructive',
                title: 'Incomplete Review',
                description: 'Please indicate if you would approve this submission',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const timeSpent = Math.round((Date.now() - startTime) / 60000); // Minutes

            const result = await submitPeerReview({
                reviewId: review.id,
                rating,
                strengths: strengths.split('\n').filter((s) => s.trim()),
                improvements: improvements.split('\n').filter((s) => s.trim()),
                questions: questions.split('\n').filter((s) => s.trim()),
                wouldApprove,
                rubricScores: RUBRIC_CATEGORIES.map((cat) => ({
                    category: cat.name,
                    score: rubricScores[cat.name] as 1 | 2 | 3 | 4 | 5,
                    comment: rubricComments[cat.name],
                })),
                timeSpent,
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            toast({
                title: 'Review Submitted!',
                description: 'Thank you for providing thoughtful feedback to your peer.',
            });

            router.push('/dashboard/training/peer-review');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: error instanceof Error ? error.message : 'Please try again',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guidelines */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    <strong>Review Guidelines:</strong> Be constructive and kind. Focus on the code, not the person.
                    Provide specific examples and suggestions. Ask clarifying questions.
                </AlertDescription>
            </Alert>

            {/* Code Display */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Code to Review</CardTitle>
                    <CardDescription>{challengeTitle}</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-[400px] text-sm font-mono">
                        {submissionCode}
                    </pre>
                </CardContent>
            </Card>

            {/* Overall Rating */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Overall Rating</CardTitle>
                    <CardDescription>How would you rate this submission overall?</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-none"
                            >
                                <Star
                                    className={`h-8 w-8 ${
                                        star <= rating
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                    }`}
                                />
                            </button>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                            {rating === 1 && 'Poor'}
                            {rating === 2 && 'Needs Work'}
                            {rating === 3 && 'Satisfactory'}
                            {rating === 4 && 'Good'}
                            {rating === 5 && 'Excellent'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Rubric Scoring */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Rubric Scores</CardTitle>
                    <CardDescription>Rate each category (1-5)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {RUBRIC_CATEGORIES.map((category) => (
                        <div key={category.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>{category.name}</Label>
                                    <p className="text-xs text-muted-foreground">{category.description}</p>
                                </div>
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((score) => (
                                        <button
                                            key={score}
                                            type="button"
                                            onClick={() =>
                                                setRubricScores((prev) => ({ ...prev, [category.name]: score }))
                                            }
                                            className={`w-8 h-8 rounded-full border-2 ${
                                                rubricScores[category.name] === score
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'border-muted hover:border-primary/50'
                                            }`}
                                        >
                                            {score}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Textarea
                                placeholder="Optional comment for this category..."
                                value={rubricComments[category.name] || ''}
                                onChange={(e) =>
                                    setRubricComments((prev) => ({ ...prev, [category.name]: e.target.value }))
                                }
                                className="text-sm"
                                rows={2}
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Strengths */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What did they do well? *</CardTitle>
                    <CardDescription>List specific strengths (one per line)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="- Great use of error handling with try/catch
- Excellent TypeScript types throughout
- Clear and descriptive variable names"
                        rows={5}
                        required
                    />
                    <div className="mt-1 text-xs text-muted-foreground">{strengths.length} characters</div>
                </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">What could be improved? *</CardTitle>
                    <CardDescription>Provide constructive suggestions (one per line)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={improvements}
                        onChange={(e) => setImprovements(e.target.value)}
                        placeholder="- Consider extracting validation logic into a separate function
- The function name could be more descriptive
- Add JSDoc comments for better documentation"
                        rows={5}
                        required
                    />
                    <div className="mt-1 text-xs text-muted-foreground">{improvements.length} characters</div>
                </CardContent>
            </Card>

            {/* Questions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Questions for the Author</CardTitle>
                    <CardDescription>Ask clarifying questions (optional)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={questions}
                        onChange={(e) => setQuestions(e.target.value)}
                        placeholder="- Why did you choose to use a for loop instead of .map()?
- Have you considered edge cases like empty arrays?"
                        rows={4}
                    />
                </CardContent>
            </Card>

            {/* Approval Decision */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Would you approve this submission? *</CardTitle>
                    <CardDescription>If you were the instructor, would you pass this?</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={wouldApprove === null ? undefined : wouldApprove ? 'yes' : 'no'}
                        onValueChange={(value) => setWouldApprove(value === 'yes')}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="approve-yes" />
                            <Label htmlFor="approve-yes" className="cursor-pointer">
                                Yes, I would approve this submission
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="approve-no" />
                            <Label htmlFor="approve-no" className="cursor-pointer">
                                No, it needs revision first
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            Submit Review
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
