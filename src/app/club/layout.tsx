import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { ClubProvider } from './components/ClubProvider';
import { ClubNav } from './components/ClubNav';

// Force dynamic rendering — club pages require auth and user-specific loyalty data
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'BakedBot Club',
    description: 'Your dispensary membership',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0f0f1a',
};

export default function ClubLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-[#0f0f1a] text-white">
            <Suspense fallback={<ClubSkeleton />}>
                <ClubProvider>
                    <main className="pb-20 max-w-lg mx-auto">
                        {children}
                    </main>
                    <ClubNav />
                </ClubProvider>
            </Suspense>
        </div>
    );
}

function ClubSkeleton() {
    return (
        <div className="flex items-center justify-center min-h-dvh">
            <div className="h-8 w-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
