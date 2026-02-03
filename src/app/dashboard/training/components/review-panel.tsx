/**
 * Review Panel Component
 *
 * Displays Linus AI feedback for code submissions.
 * Shows overall score, strengths, improvements, and category breakdowns.
 */

'use client';

import type { LinusFeedback } from '@/types/training';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ReviewPanelProps {
    feedback: LinusFeedback;
    attemptNumber: number;
}

export function ReviewPanel({ feedback, attemptNumber }: ReviewPanelProps) {
    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBadge = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 60) return 'Passing';
        return 'Needs Work';
    };

    return (
        <div className="space-y-6">
            {/* Overall Status */}
            <Card className={feedback.approved ? 'border-green-500' : 'border-yellow-500'}>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {feedback.approved ? (
                                    <>
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                        Approved!
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="h-6 w-6 text-yellow-600" />
                                        Needs Revision
                                    </>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Attempt #{attemptNumber} • Reviewed by Linus (AI CTO)
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${getScoreColor(feedback.overallScore)}`}>
                                {feedback.overallScore}
                            </div>
                            <Badge variant={feedback.approved ? 'default' : 'secondary'}>
                                {getScoreBadge(feedback.overallScore)}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <Alert variant={feedback.approved ? 'default' : 'destructive'}>
                        <AlertTitle>
                            {feedback.approved ? '✅ Ready to move forward!' : '📝 Review the feedback below'}
                        </AlertTitle>
                        <AlertDescription>{feedback.summary}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Strengths */}
            {feedback.strengths.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            What You Did Well
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {feedback.strengths.map((strength, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Improvements */}
            {feedback.improvements.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-600" />
                            Areas for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {feedback.improvements.map((improvement, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-semibold mt-0.5">
                                        {i + 1}
                                    </div>
                                    <span className="text-sm">{improvement}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* Category Scores */}
            {feedback.categoryScores.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Scores</CardTitle>
                        <CardDescription>Breakdown by review criteria</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {feedback.categoryScores.map((category, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{category.category}</span>
                                    <span className={`text-lg font-semibold ${getScoreColor(category.score)}`}>
                                        {category.score}/100
                                    </span>
                                </div>
                                <Progress value={category.score} className="h-2" />
                                <p className="text-sm text-muted-foreground">{category.feedback}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Next Steps */}
            {!feedback.approved && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Next Steps</AlertTitle>
                    <AlertDescription>
                        Review the feedback above, make the suggested improvements, and resubmit your solution.
                        Don't hesitate to ask questions on Slack if anything is unclear!
                    </AlertDescription>
                </Alert>
            )}

            {feedback.approved && (
                <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Great Job!</AlertTitle>
                    <AlertDescription>
                        Your solution meets the requirements. Move on to the next challenge or take a moment to
                        review the feedback to improve even more.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
