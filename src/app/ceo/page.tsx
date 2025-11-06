
'use client';

import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldCheck, TestTube2, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CeoPage() {
  const { isCeoMode, toggleCeoMode, isDemoMode, toggleDemoMode } = useStore();

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
            <CardTitle className="text-2xl">Admin Controls</CardTitle>
            <CardDescription>
              {isCeoMode
                ? 'CEO Mode is active. Advanced features are enabled.'
                : 'Activate CEO Mode for advanced administrative features.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className='flex items-center space-x-2 rounded-lg border p-4'>
            <ShieldCheck className='h-6 w-6' />
            <div className="flex-1 space-y-1">
                <Label htmlFor="ceo-mode-switch">CEO Mode</Label>
                <p className='text-xs text-muted-foreground'>
                    Unlock sidebar editing and other administrative controls.
                </p>
            </div>
             <Switch id="ceo-mode-switch" checked={isCeoMode} onCheckedChange={toggleCeoMode} />
          </div>
          <div className='flex items-center space-x-2 rounded-lg border p-4'>
            <FlaskConical className='h-6 w-6' />
            <div className="flex-1 space-y-1">
                <Label htmlFor="demo-mode-switch">Demo Mode</Label>
                <p className='text-xs text-muted-foreground'>
                    Populate the app with sample data for demonstration.
                </p>
            </div>
             <Switch id="demo-mode-switch" checked={isDemoMode} onCheckedChange={toggleDemoMode} />
          </div>
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
