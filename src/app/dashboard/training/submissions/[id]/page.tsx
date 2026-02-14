/**
 * Submission Detail Page
 *
 * Displays a single submission with full code, notes, and Linus feedback.
 */

// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { TrainingSubmission, TrainingChallenge } from '@/types/training';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Calendar, Hash, Code2 } from 'lucide-react';
import { ReviewPanel } from '../../components/review-panel';

interface SubmissionPageProps {
    params: {
        id: string;
    };
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
    const user = await requireUser(['intern', 'super_user']);
    const db = getAdminFirestore();

    // Fetch submission
    const submissionDoc = await db.collection('trainingSubmissions').doc(params.id).get();

    if (!submissionDoc.exists) {
        notFound();
    }

    const submission = submissionDoc.data() as TrainingSubmission;

    // Verify ownership
    const isSuperUser = (user as any).role?.includes('super_user');
    if (submission.userId !== user.uid && !isSuperUser) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
                    <h2 className="text-lg font-semibold text-destructive">Unauthorized</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        You don't have permission to view this submission.
                    </p>
                </div>
            </div>
        );
    }

    // Fetch challenge details
    const challengeDoc = await db.collection('trainingChallenges').doc(submission.challengeId).get();
    const challenge = challengeDoc.exists ? (challengeDoc.data() as TrainingChallenge) : null;

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div>
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href={`/dashboard/training/challenge/${submission.challengeId}`}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Challenge
                    </Link>
                </Button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {challenge?.title || 'Submission Details'}
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Attempt #{submission.attemptNumber} • Submitted{' '}
                            {new Date(submission.submittedAt.seconds * 1000).toLocaleString()}
                        </p>
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
            </div>

            {/* Metadata */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Submission Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Attempt:</span>
                            <span className="font-medium">#{submission.attemptNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Language:</span>
                            <span className="font-medium">{submission.language}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Submitted:</span>
                            <span className="font-medium">
                                {new Date(submission.submittedAt.seconds * 1000).toLocaleDateString()}
                            </span>
                        </div>
                        {submission.reviewedAt && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Reviewed:</span>
                                <span className="font-medium">
                                    {new Date(submission.reviewedAt.seconds * 1000).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Submitted Code */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Code</CardTitle>
                    <CardDescription>The code you submitted for review</CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto max-h-[600px]">
                        <code className="text-sm font-mono">{submission.code}</code>
                    </pre>
                    <div className="mt-2 text-xs text-muted-foreground">
                        {submission.code.split('\n').length} lines •{' '}
                        {submission.code.length} characters
                    </div>
                </CardContent>
            </Card>

            {/* Optional Description */}
            {submission.description && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your Notes</CardTitle>
                        <CardDescription>Your explanation and questions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{submission.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Linus Feedback */}
            {submission.linusFeedback ? (
                <ReviewPanel feedback={submission.linusFeedback} attemptNumber={submission.attemptNumber} />
            ) : (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">
                            {submission.status === 'reviewing'
                                ? '⏳ Linus is reviewing your code. This typically takes 30-60 seconds. Refresh to see results.'
                                : '⏸️ Review pending. Please check back later.'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-between">
                <Button variant="outline" asChild>
                    <Link href={`/dashboard/training/challenge/${submission.challengeId}`}>
                        Back to Challenge
                    </Link>
                </Button>

                {submission.status === 'needs_revision' && (
                    <Button asChild>
                        <Link href={`/dashboard/training/challenge/${submission.challengeId}?tab=submit`}>
                            Submit Revision
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
