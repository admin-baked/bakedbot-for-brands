'use client';
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn } from 'lucide-react';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

export default function DispensaryPinLoginPage() {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        if (/^[0-9]$/.test(value)) {
            setPin(prev => {
                const newPin = prev.split('');
                newPin[index] = value;
                return newPin.join('');
            });
            if (index < 4) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length !== 5) {
            toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter a 5-digit PIN.' });
            return;
        }
        setIsLoading(true);
        // TODO: Implement server action to verify PIN
        console.log('Verifying PIN:', pin);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network request
        toast({ variant: 'destructive', title: 'Login Failed', description: 'PIN verification is not yet implemented.' });
        setIsLoading(false);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="items-center space-y-4 text-center">
                    <Logo height={32} />
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">Dispensary PIN Login</CardTitle>
                        <CardDescription>Enter the 5-digit PIN for your location.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="pin-1" className="sr-only">PIN</Label>
                            <div className="flex justify-center gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <Input
                                        key={i}
                                        ref={el => inputRefs.current[i] = el}
                                        id={`pin-${i}`}
                                        type="tel"
                                        maxLength={1}
                                        className="h-14 w-12 text-center text-2xl font-semibold"
                                        value={pin[i] || ''}
                                        onChange={(e) => handleInputChange(e, i)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || pin.length !== 5}>
                            {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <LogIn className="mr-2" />}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}