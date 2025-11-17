'use client';

import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { CartSheet } from "@/components/cart-sheet";
import { useCookieStore } from "@/lib/cookie-storage";
import { useStore } from "@/hooks/use-store";
import { useEffect, useState } from "react";
import { useFirebase } from "@/firebase/provider";
import { collection, getDocs, query } from "firebase/firestore";
import type { Retailer } from "@/types/domain";
import { retailerConverter } from "@/firebase/converters";
import { demoRetailers } from "@/lib/data";

export function Providers({ children }: { children: React.ReactNode }) {
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
        <FirebaseClientProvider>
            <ThemeProvider>
                {children}
                <CartSheet locations={locations} />
            </ThemeProvider>
        </FirebaseClientProvider>
    )
}
