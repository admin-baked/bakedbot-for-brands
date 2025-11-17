
'use client';

import { CartSheet } from '@/components/cart-sheet';
import { ThemeProvider } from '@/components/theme-provider';
import { useStore } from '@/hooks/use-store';
import { useCookieStore } from '@/lib/cookie-storage';
import { useFirebase } from '@/firebase/provider';
import { useEffect, useState } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { retailerConverter, type Retailer } from '@/firebase/converters';
import { demoRetailers } from '@/lib/data';
import Header from '@/components/header';
import { Footer } from '@/components/footer';

/**
 * AppProviders is a client component that sets up global providers
 * and the main app layout structure (Header, Footer).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const { _hasHydrated } = useCookieStore();
  const { firestore } = useFirebase();
  const [locations, setLocations] = useState<Retailer[]>(demoRetailers);

  const { selectedRetailerId, setSelectedRetailerId } = useStore();
  const { favoriteRetailerId } = useCookieStore();

  useEffect(() => {
    if (_hasHydrated) {
      if (!selectedRetailerId && favoriteRetailerId) {
        setSelectedRetailerId(favoriteRetailerId);
      }
    }
  }, [_hasHydrated, selectedRetailerId, favoriteRetailerId, setSelectedRetailerId]);

  useEffect(() => {
    async function fetchLocations() {
      if (!firestore) return;
      try {
        const locationsQuery = query(collection(firestore, 'dispensaries')).withConverter(retailerConverter);
        const snapshot = await getDocs(locationsQuery);
        if (!snapshot.empty) {
          const fetchedLocations = snapshot.docs.map(doc => doc.data());
          setLocations(fetchedLocations);
        }
      } catch (error) {
        console.error("Failed to fetch locations for providers:", error);
      }
    }
    fetchLocations();
  }, [firestore]);


  return (
    <ThemeProvider>
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </div>
        <CartSheet locations={locations}/>
    </ThemeProvider>
  );
}
