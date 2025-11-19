
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileJson } from 'lucide-react';
import type { FirestorePermissionError } from '@/firebase/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: (Error & { digest?: string }) | FirestorePermissionError;
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  // Check if it's our custom Firestore permission error
  const isPermissionError = 'request' in error && typeof error.request === 'object';
  const permissionError = isPermissionError ? (error as FirestorePermissionError) : null;

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Card className="w-full max-w-2xl">
            <CardHeader className="items-center text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <CardTitle className="mt-4 text-2xl">
                {isPermissionError ? 'Firestore Permission Denied' : 'Something Went Wrong'}
                </CardTitle>
                <CardDescription>
                {isPermissionError
                    ? 'An operation was blocked by your Firestore security rules.'
                    : 'An unexpected error occurred. Please try again.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {permissionError && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                    <div className="flex items-center gap-2 font-semibold">
                    <FileJson className="h-5 w-5" />
                    Denied Request Details
                    </div>
                    <pre className="text-xs whitespace-pre-wrap rounded-md bg-background p-4 font-mono text-foreground overflow-auto">
                    <code>{JSON.stringify(permissionError.request, null, 2)}</code>
                    </pre>
                </div>
                )}
                {!isPermissionError && (
                    <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-destructive-foreground overflow-auto">
                    <code>{error.message}</code>
                    {error.stack && <div className="mt-4">{error.stack}</div>}
                    </pre>
                )}
                <div className="flex justify-center gap-2">
                <Button onClick={() => reset()}>Try Again</Button>
                <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>
                    Go to Dashboard
                </Button>
                </div>
            </CardContent>
            </Card>
        </div>
      </body>
    </html>
  );
}
