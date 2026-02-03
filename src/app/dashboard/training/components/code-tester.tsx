/**
 * Code Tester Component
 *
 * Allows interns to run their code and see test results before submitting.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface CodeTesterProps {
    challengeId: string;
    code: string;
}

interface TestResult {
    title: string;
    status: 'passed' | 'failed';
    duration: number;
    failureMessage?: string;
}

interface ExecutionResult {
    success: boolean;
    output: string;
    testResults?: {
        numPassedTests: number;
        numFailedTests: number;
        numTotalTests: number;
        testResults: TestResult[];
    };
    executionTime: number;
    error?: string;
    message?: string;
}

export function CodeTester({ challengeId, code }: CodeTesterProps) {
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<ExecutionResult | null>(null);

    const handleRunCode = async () => {
        setIsRunning(true);
        setResult(null);

        try {
            const response = await fetch('/api/training/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    challengeId,
                    code,
                }),
            });

            const data: ExecutionResult = await response.json();
            setResult(data);
        } catch (error) {
            setResult({
                success: false,
                output: '',
                error: 'Failed to execute code. Please try again.',
                executionTime: 0,
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5" />
                            Test Your Code
                        </CardTitle>
                        <CardDescription>Run automated tests before submitting</CardDescription>
                    </div>
                    <Button onClick={handleRunCode} disabled={isRunning || code.length < 10}>
                        {isRunning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Run Tests
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Info alert when no results yet */}
                {!result && !isRunning && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Click "Run Tests" to execute your code and see if it passes all tests. This won't
                            submit your solution.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Running indicator */}
                {isRunning && (
                    <Alert>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <AlertTitle>Running Tests...</AlertTitle>
                        <AlertDescription>
                            This typically takes 2-5 seconds. Your code is being executed in a secure environment.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Results */}
                {result && !isRunning && (
                    <>
                        {/* Success summary */}
                        {result.success && result.testResults && (
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-900">All Tests Passed! ✅</AlertTitle>
                                <AlertDescription className="text-green-700">
                                    {result.testResults.numPassedTests} test{result.testResults.numPassedTests !== 1 ? 's' : ''} passed in{' '}
                                    {result.executionTime}ms. Your code is ready to submit for review!
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Failure summary */}
                        {!result.success && result.testResults && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertTitle>Tests Failed ❌</AlertTitle>
                                <AlertDescription>
                                    {result.testResults.numFailedTests} test{result.testResults.numFailedTests !== 1 ? 's' : ''} failed.
                                    Review the details below and fix your code.
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Error */}
                        {result.error && (
                            <Alert variant="destructive">
                                <XCircle className="h-4 w-4" />
                                <AlertTitle>Execution Error</AlertTitle>
                                <AlertDescription>
                                    {result.message || result.error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Execution metadata */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {result.executionTime}ms
                            </div>
                            {result.testResults && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        {result.testResults.numPassedTests} passed
                                    </div>
                                    {result.testResults.numFailedTests > 0 && (
                                        <div className="flex items-center gap-1">
                                            <XCircle className="h-3 w-3 text-red-600" />
                                            {result.testResults.numFailedTests} failed
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Test results details */}
                        {result.testResults && result.testResults.testResults.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Test Results:</h4>
                                <div className="space-y-2">
                                    {result.testResults.testResults.map((test, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border ${
                                                test.status === 'passed'
                                                    ? 'bg-green-50 border-green-200'
                                                    : 'bg-red-50 border-red-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {test.status === 'passed' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-red-600" />
                                                    )}
                                                    <span className="text-sm font-medium">{test.title}</span>
                                                </div>
                                                <Badge variant={test.status === 'passed' ? 'default' : 'destructive'}>
                                                    {test.duration}ms
                                                </Badge>
                                            </div>

                                            {/* Failure message */}
                                            {test.failureMessage && (
                                                <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                                                    {test.failureMessage}
                                                </pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Raw output (for debugging) */}
                        {result.output && (
                            <details className="text-sm">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                    Show raw output
                                </summary>
                                <pre className="mt-2 p-3 bg-muted rounded-lg overflow-x-auto text-xs">
                                    {result.output}
                                </pre>
                            </details>
                        )}
                    </>
                )}

                {/* Help text */}
                <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> Run tests as many times as you need. Once all tests pass, submit your
                    code for Linus to review your implementation style and best practices.
                </p>
            </CardContent>
        </Card>
    );
}
