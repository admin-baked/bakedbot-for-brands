
'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { CallbackClientInner } from './CallbackClientInner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function Fallback() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle>Authenticating...</CardTitle>
                    <CardDescription>Completing sign-in...</CardDescription>
                </CardHeader>
                <CardContent>
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                </CardContent>
            </Card>
        </div>
    )
}

export default function Page() {
  return (
    <Suspense fallback={<Fallback />}>
      <CallbackClientInner />
    </Suspense>
  );
}
