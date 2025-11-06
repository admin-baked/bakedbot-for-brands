'use client';

import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function CeoPage() {
  const { isCeoMode, toggleCeoMode } = useStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-4 text-center">
          {isCeoMode ? (
             <ShieldCheck className="h-12 w-12 text-primary" />
          ) : (
             <Shield className="h-12 w-12 text-muted-foreground" />
          )}
          <div className="space-y-1">
            <CardTitle className="text-2xl">CEO Mode</CardTitle>
            <CardDescription>
              {isCeoMode
                ? 'CEO Mode is currently active. Advanced editing features are enabled.'
                : 'Activate CEO Mode to access advanced administrative features.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={toggleCeoMode} className="w-full">
            {isCeoMode ? 'Deactivate CEO Mode' : 'Activate CEO Mode'}
          </Button>
        </CardContent>
        <CardContent className="text-center">
            <Button variant="link" asChild>
                <Link href="/dashboard">
                    Return to Dashboard
                </Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
