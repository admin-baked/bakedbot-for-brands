'use client';

/**
 * Email Capture Modal for Agent Playground
 * 
 * Triggered when:
 * - Rate limit exceeded (5 free demos)
 * - User wants to unlock full results
 * - User wants video generation (requires login)
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface EmailCaptureModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EmailCaptureModal({ open, onClose, onSuccess }: EmailCaptureModalProps) {
    const [email, setEmail] = useState('');
    const [company, setCompany] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email.trim() || !company.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/demo/lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), company: company.trim() })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit');
            }

            // Store email locally for rate limit bypass
            localStorage.setItem('bakedbot_lead_email', email.trim());
            localStorage.setItem('bakedbot_lead_company', company.trim());

            setSuccess(true);
            
            // Brief delay to show success state
            setTimeout(() => {
                onSuccess();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-xl border-white/10">
                {success ? (
                    <div className="flex flex-col items-center py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">You're In!</h3>
                        <p className="text-muted-foreground">
                            Welcome to BakedBot. Unlimited demos unlocked.
                        </p>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Unlock Full Power
                            </DialogTitle>
                            <DialogDescription>
                                Get unlimited access to all AI agents and full reports.
                                No credit card required.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Work Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@dispensary.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company">Dispensary / Brand Name</Label>
                                <Input
                                    id="company"
                                    type="text"
                                    placeholder="Your Company"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                    disabled={isLoading}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full" 
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Start Free Trial
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                We'll send you a setup guide and tips. Unsubscribe anytime.
                            </p>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
