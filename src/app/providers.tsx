
'use client';

import { ThemeProvider } from "@/components/theme-provider";
import { CartSheet } from "@/components/cart-sheet";
import { FirebaseClientProvider } from "@/firebase/client-provider";

export function Providers({ children }: { children: React.ReactNode }) {
    // The logic for syncing favorite retailer has been moved to DispensaryLocator
    // where it is more contextually relevant.
    return (
        <FirebaseClientProvider>
            <ThemeProvider>
                {children}
                <CartSheet />
            </ThemeProvider>
        </FirebaseClientProvider>
    )
}
