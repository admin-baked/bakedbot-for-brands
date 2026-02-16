'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function WebAgeGate() {
    const [verified, setVerified] = useState(true); // Default to true to prevent flash, check effect
    const [scanning, setScanning] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const isVerified = localStorage.getItem('age_verified') === 'true';
        setVerified(isVerified);
    }, []);

    const handleVerify = () => {
        setScanning(true);
        // Simulate Scan Delay
        setTimeout(() => {
            setScanning(false);
            setVerified(true);
            localStorage.setItem('age_verified', 'true');
            toast({
                title: "Identity Verified",
                description: "Welcome to our compliant storefront.",
            });
        }, 1500);
    };

    if (verified) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md shadow-2xl border-2 border-primary/20">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Age Verification Required</CardTitle>
                    <CardDescription>
                        You must be 21+ to view this menu.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-center text-sm text-muted-foreground">
                        To comply with state cannabis regulations, we must verify that all visitors are 21 years of age or older.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                    <Button className="w-full" size="lg" onClick={handleVerify} disabled={scanning}>
                        {scanning ? "Verifying..." : "I am 21 or Older"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                        By entering, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
