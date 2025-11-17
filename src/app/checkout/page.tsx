
'use client';
export const dynamic = 'force-dynamic';

import { useStore } from '@/hooks/use-store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import Header from '@/components/header';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin } from 'lucide-react';
import { CheckoutForm } from '@/components/checkout-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/footer';
import { useHydrated } from '@/hooks/use-hydrated';
import { Skeleton } from '@/components/ui/skeleton';
import { useCookieStore } from '@/lib/cookie-storage';
import { demoRetailers } from '@/lib/data';
import { Retailer } from '@/types/domain';
import { useEffect, useState } from 'react';
import { createServerClient } from '@/firebase/server-client';
import { collection, getDocs, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import CheckoutClientPage from './checkout-client-page';


export default function CheckoutPage() {
  const { isDemo } = useCookieStore();
  const { firestore } = useFirebase();
  const [locations, setLocations] = useState<Retailer[]>(demoRetailers);
  const [isLoading, setIsLoading] = useState(!isDemo);

  useEffect(() => {
    async function fetchLocations() {
      if (isDemo || !firestore) {
        setLocations(demoRetailers);
        setIsLoading(false);
        return;
      };
      setIsLoading(true);
      try {
        const locationsSnap = await getDocs(query(collection(firestore, 'dispensaries')));
        if (!locationsSnap.empty) {
          setLocations(locationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Retailer[]);
        }
      } catch (error) {
        console.error("Failed to fetch locations for checkout, falling back to demo data.", error);
        setLocations(demoRetailers);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLocations();
  }, [isDemo, firestore]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center text-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading checkout...</p>
      </div>
    );
  }

  return <CheckoutClientPage locations={locations} isDemo={isDemo} />;
}
