
'use client';

import { ThemeProvider } from "@/components/theme-provider";
import { CartSheet } from "@/components/cart-sheet";
import { useCookieStore } from "@/lib/cookie-storage";
import { useStore } from "@/hooks/use-store";
import { useEffect } from "react";
import { FirebaseClientProvider } from "@/firebase/client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    const { _hasHydrated } = useCookieStore();
    const { selectedRetailerId, setSelectedRetailerId } = useStore();
    const { favoriteRetailerId } = useCookieStore();

    useEffect(() => {
        if (_hasHydrated) {
            if (!selectedRetailerId && favoriteRetailerId) {
                setSelectedRetailerId(favoriteRetailerId);
            }
        }
    }, [_hasHydrated, selectedRetailerId, favoriteRetailerId, setSelectedRetailerId]);


    return (
        <FirebaseClientProvider>
            <ThemeProvider>
                {children}
                <CartSheet />
            </ThemeProvider>
        </FirebaseClientProvider>
    )
}
