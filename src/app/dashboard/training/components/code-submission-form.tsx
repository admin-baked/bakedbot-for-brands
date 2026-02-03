/**
 * Code Submission Form Component
 *
 * Allows interns to submit code for challenges with a simple textarea.
 * Phase 2 will upgrade to Monaco Editor for better experience.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, Code2 } from 'lucide-react';
import { submitChallenge } from '@/server/actions/training';
import { useToast } from '@/hooks/use-toast';

interface CodeSubmissionFormProps {
    challengeId: string;
    cohortId: string;
    starterCode?: string;
    attemptNumber: number;
}

export function CodeSubmissionForm({ challengeId, cohortId, starterCode, attemptNumber }: CodeSubmissionFormProps) {
    const [code, setCode] = useState(starterCode || '');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic validation
        if (code.trim().length < 10) {
            setError('Code must be at least 10 characters long');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await submitChallenge({
                challengeId,
                cohortId,
                code: code.trim(),
                language: 'typescript',
                description: description.trim() || undefined,
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            toast({
                title: 'Submission Received!',
                description: 'Linus is reviewing your code. This typically takes 30-60 seconds.',
            });

            // Redirect to submission view
            router.push(`/dashboard/training/submissions/${result.data.submissionId}`);
        } catch (err) {
            setError('Failed to submit. Please try again.');
            console.error('Submission error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const characterCount = code.length;
    const lineCount = code.split('\n').length;

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code2 className="h-5 w-5" />
                        Submit Your Solution
                    </CardTitle>
                    <CardDescription>
                        {attemptNumber > 1 ? `Attempt #${attemptNumber}` : 'First attempt'} - Write your code below
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Code Input */}
                    <div className="space-y-2">
                        <Label htmlFor="code">Your Code *</Label>
                        <Textarea
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="'use server';

import { requireUser } from '@/server/auth/auth';

// Your code here..."
                            className="font-mono text-sm min-h-[400px] resize-y"
                            required
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                                {lineCount} lines • {characterCount} characters
                            </span>
                            <span>{code.length >= 10 ? '✓' : '✗'} Min 10 characters</span>
                        </div>
                    </div>

                    {/* Optional Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">
                            Notes (Optional)
                            <span className="text-xs text-muted-foreground ml-2">
                                Explain your approach or ask questions
                            </span>
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="I approached this by...

Questions:
- Is this the right way to handle errors?"
                            className="text-sm min-h-[100px] resize-y"
                            maxLength={500}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {description.length} / 500
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Submission Info */}
                    <Alert>
                        <AlertDescription className="text-sm">
                            💡 <strong>Tip:</strong> Linus reviews typically take 30-60 seconds. You'll see feedback
                            on code quality, TypeScript usage, and BakedBot standards.
                        </AlertDescription>
                    </Alert>
                </CardContent>

                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting || code.length < 10}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Submit for Review
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
