/**
 * Challenge Detail - Client Component
 *
 * Interactive challenge view with instructions, submission form, and history.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TrainingChallenge, TrainingSubmission, UserTrainingProgress } from '@/types/training';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    CheckCircle2,
    Clock,
    FileText,
    Lightbulb,
    ExternalLink,
    ChevronLeft,
    Trophy,
    AlertCircle,
} from 'lucide-react';
import { CodeSubmissionForm } from '../../components/code-submission-form';
import { ReviewPanel } from '../../components/review-panel';
import ReactMarkdown from 'react-markdown';

interface ChallengeDetailClientProps {
    challenge: TrainingChallenge;
    progress: UserTrainingProgress;
    submissions: TrainingSubmission[];
    isCompleted: boolean;
    latestSubmission?: TrainingSubmission;
}

export function ChallengeDetailClient({
    challenge,
    progress,
    submissions,
    isCompleted,
    latestSubmission,
}: ChallengeDetailClientProps) {
    const [activeTab, setActiveTab] = useState('instructions');

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner':
                return 'bg-green-500';
            case 'intermediate':
                return 'bg-yellow-500';
            case 'advanced':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getPendingReview = submissions.find((s) => s.status === 'reviewing' || s.status === 'pending');

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div>
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href="/dashboard/training">
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Training
                    </Link>
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Week {challenge.weekNumber}</Badge>
                            <Badge className={getDifficultyColor(challenge.difficulty)}>
                                {challenge.difficulty}
                            </Badge>
                            {challenge.isRequired && <Badge variant="secondary">Required</Badge>}
                            {isCompleted && (
                                <Badge className="bg-green-600">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Completed
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">{challenge.title}</h1>
                        <p className="text-muted-foreground mt-2">{challenge.description}</p>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                        <Clock className="inline h-4 w-4 mr-1" />
                        {challenge.estimatedMinutes} min
                    </div>
                </div>
            </div>

            {/* Completion Alert */}
            {isCompleted && (
                <Alert className="bg-green-50 border-green-200">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Challenge Completed!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Great job! You can still review your submission or try to improve your score.
                    </AlertDescription>
                </Alert>
            )}

            {/* Pending Review Alert */}
            {getPendingReview && !isCompleted && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Review in Progress</AlertTitle>
                    <AlertDescription>
                        Linus is reviewing your submission (Attempt #{getPendingReview.attemptNumber}). This
                        typically takes 30-60 seconds. Refresh to see results.
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="instructions">
                        <FileText className="mr-2 h-4 w-4" />
                        Instructions
                    </TabsTrigger>
                    <TabsTrigger value="submit">Submit Solution</TabsTrigger>
                    <TabsTrigger value="submissions" className="relative">
                        History
                        {submissions.length > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                                {submissions.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="hints">
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Hints
                    </TabsTrigger>
                </TabsList>

                {/* Instructions Tab */}
                <TabsContent value="instructions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Challenge Instructions</CardTitle>
                            <CardDescription>Read carefully before starting</CardDescription>
                        </CardHeader>
                        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{challenge.instructions}</ReactMarkdown>
                        </CardContent>
                    </Card>

                    {/* Reference Docs */}
                    {challenge.referenceDocs.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Reference Materials</CardTitle>
                                <CardDescription>Helpful resources for this challenge</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {challenge.referenceDocs.map((doc, i) => (
                                        <a
                                            key={i}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            {doc.title}
                                        </a>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Starter Code */}
                    {challenge.starterCode && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Starter Code</CardTitle>
                                <CardDescription>Use this as a starting point</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                    <code className="text-sm font-mono">{challenge.starterCode}</code>
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Submit Tab */}
                <TabsContent value="submit" className="space-y-4">
                    <CodeSubmissionForm
                        challengeId={challenge.id}
                        cohortId={progress.cohortId}
                        starterCode={challenge.starterCode}
                        attemptNumber={submissions.length + 1}
                    />
                </TabsContent>

                {/* Submissions History Tab */}
                <TabsContent value="submissions" className="space-y-4">
                    {submissions.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                <p>No submissions yet. Submit your solution to get started!</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {submissions.map((submission) => (
                                <Card key={submission.id}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-base">
                                                    Attempt #{submission.attemptNumber}
                                                </CardTitle>
                                                <CardDescription>
                                                    {new Date(
                                                        submission.submittedAt.seconds * 1000
                                                    ).toLocaleString()}
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                variant={
                                                    submission.status === 'approved'
                                                        ? 'default'
                                                        : submission.status === 'needs_revision'
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                            >
                                                {submission.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Show feedback if available */}
                                        {submission.linusFeedback ? (
                                            <ReviewPanel
                                                feedback={submission.linusFeedback}
                                                attemptNumber={submission.attemptNumber}
                                            />
                                        ) : (
                                            <Alert>
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    {submission.status === 'reviewing'
                                                        ? 'Linus is reviewing your code...'
                                                        : 'Review pending'}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* View submission link */}
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/dashboard/training/submissions/${submission.id}`}>
                                                View Full Submission
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Hints Tab */}
                <TabsContent value="hints" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hints</CardTitle>
                            <CardDescription>Stuck? These hints might help</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {challenge.hints.map((hint, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                            {i + 1}
                                        </div>
                                        <span className="text-sm">{hint}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>Try Before Using Hints</AlertTitle>
                        <AlertDescription>
                            Learning happens when you struggle a bit! Try solving the challenge on your own before
                            checking hints. You can always come back here if you get stuck.
                        </AlertDescription>
                    </Alert>
                </TabsContent>
            </Tabs>
        </div>
    );
}
