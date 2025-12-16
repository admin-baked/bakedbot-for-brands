'use client';

/**
 * Drop Alert Modal Component
 * Allows users to sign up for notifications when a brand drops in their area
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Bell, CheckCircle2, Loader2, Mail, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DropAlertButtonProps {
    brandName: string;
    zipCode?: string;
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
}

export function DropAlertButton({ brandName, zipCode, variant = 'outline', className }: DropAlertButtonProps) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [zip, setZip] = useState(zipCode || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !zip) {
            toast({
                title: 'Missing Information',
                description: 'Please enter your email and ZIP code.',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);

        try {
            // Save to Firestore via API or server action
            const response = await fetch('/api/drop-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    zipCode: zip,
                    brandName,
                    createdAt: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save alert');
            }

            setSuccess(true);
            toast({
                title: 'Drop Alert Set! 🔔',
                description: `We'll email you when ${brandName} is available near ${zip}.`
            });

            // Close after delay
            setTimeout(() => {
                setOpen(false);
                setSuccess(false);
                setEmail('');
            }, 2000);

        } catch (error) {
            console.error('Error setting drop alert:', error);
            toast({
                title: 'Error',
                description: 'Failed to set drop alert. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} className={className}>
                    <Bell className="w-4 h-4 mr-2" />
                    Set Drop Alert
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                {success ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">You&apos;re All Set!</h3>
                        <p className="text-muted-foreground text-sm">
                            We&apos;ll notify you when {brandName} drops near {zip}.
                        </p>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                Get Notified
                            </DialogTitle>
                            <DialogDescription>
                                Be the first to know when <strong>{brandName}</strong> is available in your area.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zip">ZIP Code</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="zip"
                                        type="text"
                                        placeholder="90210"
                                        className="pl-10"
                                        maxLength={5}
                                        value={zip}
                                        onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Setting Alert...
                                        </>
                                    ) : (
                                        <>
                                            <Bell className="mr-2 h-4 w-4" />
                                            Notify Me
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                        <p className="text-xs text-center text-muted-foreground">
                            We&apos;ll only email you about {brandName} drops. No spam.
                        </p>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
