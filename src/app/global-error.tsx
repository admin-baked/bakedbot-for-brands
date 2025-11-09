'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileJson } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  const isPermissionError = error.name === 'FirebaseError';

  return (
    <html>
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
              {isPermissionError && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <FileJson className="h-5 w-5" />
                    Denied Request Details
                  </div>
                  <pre className="text-xs whitespace-pre-wrap rounded-md bg-background p-4 font-mono text-foreground overflow-auto">
                    <code>{error.message.replace('Missing or insufficient permissions: The following request was denied by Firestore Security Rules:', '')}</code>
                  </pre>
                </div>
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
