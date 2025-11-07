'use client';

import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function CeoPage() {
  const { isCeoMode } = useStore();

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
            <CardTitle className="text-2xl">Admin Status</CardTitle>
            <CardDescription>
              {isCeoMode
                ? 'CEO Mode is active. Advanced features are enabled.'
                : 'CEO Mode is not active for your account.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-center">
             <p className="text-sm text-muted-foreground">
                This status is determined by a secure custom claim on your user account. It cannot be changed from this screen.
             </p>
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
