'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Header from '../components/header';
import { Footer } from '../components/footer';

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/brand-login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-muted/20">
            <div className="container mx-auto px-4 py-8">
                <div className="mx-auto max-w-2xl">
                    <Card>
                        <CardHeader className="text-center">
                             <User className="mx-auto h-12 w-12 text-primary" />
                            <CardTitle className="mt-4 text-2xl">My Account</CardTitle>
                            <CardDescription>
                                Welcome back, {user.displayName || user.email}!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                             <Button asChild size="lg">
                                <Link href="/account/dashboard">
                                    Go to My Dashboard
                                </Link>
                             </Button>
                             <Button asChild variant="outline" size="lg">
                                 <Link href="/">
                                    Continue Shopping
                                 </Link>
                             </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
        <Footer />
    </div>
  );
}
