'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function RedirectToSignin() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/signin');
    }, [router]);

    return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Spinner size="lg" />
                <p className="text-muted-foreground animate-pulse">Redirecting to unified login...</p>
            </div>
        </div>
    );
}
