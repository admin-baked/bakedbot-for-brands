
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DevLoginButton from '@/components/dev-login-button';

export default function BrandLoginPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Brand Login</CardTitle>
          <CardDescription>
            Access your dashboard to manage your brand and products.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* The DevLoginButton is a temporary UI for easy authentication switching in development */}
            {/* It would be replaced by a real login form (e.g., email/password or OAuth) in production */}
           <DevLoginButton />
        </CardContent>
      </Card>
    </div>
  );
}
