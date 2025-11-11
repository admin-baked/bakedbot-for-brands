'use client';

import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, User, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Header from '../components/header';
import { Footer } from '../components/footer';
import { useFirebase } from '@/firebase/provider';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { auth } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/brand-login');
    }
  }, [user, isUserLoading, router]);
  
  const handleSignOut = async () => {
    try {
      if(auth) {
        await signOut(auth);
      }
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
      router.push('/');
    } catch (error) {
      console.error('Sign out error', error);
       toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: "Could not sign you out. Please try again.",
      });
    }
  };

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
                         <CardFooter className="flex-col gap-4 px-6 pt-4">
                            <Separator className="mb-2"/>
                             <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSignOut}>
                                <LogOut className="mr-2" />
                                Sign Out
                             </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </main>
        <Footer />
    </div>
  );
}
