
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, CalendarX } from 'lucide-react';

export function AgeGate() {
    const [isVisible, setIsVisible] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Check if previously verified
        const verified = localStorage.getItem('age_verified');
        if (!verified) {
            setIsVisible(true);
            // Prevent scrolling when gate is open
            document.body.style.overflow = 'hidden';
        }
    }, []);

    const handleVerify = () => {
        localStorage.setItem('age_verified', 'true');
        setIsVisible(false);
        document.body.style.overflow = 'auto'; // Restore scrolling
    };

    const handleReject = () => {
        window.location.href = 'https://google.com';
    };

    if (!isClient || !isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md border-2 border-primary shadow-2xl animate-in fade-in zoom-in duration-300">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Age Verification Required</CardTitle>
                    <CardDescription className="text-base mt-2">
                        You must be 21 years or older to view this content.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid gap-4">
                        <Button size="lg" className="w-full text-lg font-semibold" onClick={handleVerify}>
                            Yes, I am 21+
                        </Button>
                        <Button size="lg" variant="outline" className="w-full" onClick={handleReject}>
                            <CalendarX className="mr-2 h-4 w-4" />
                            No, I am under 21
                        </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        By entering this site, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
