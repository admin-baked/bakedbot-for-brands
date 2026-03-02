'use client';

import { useState } from 'react';
import { captureNYLead } from '@/server/actions/ny-lead-capture';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    CheckCircle2,
    ShieldCheck,
    Crown,
} from 'lucide-react';

interface FoundingPartnerFormProps {
    spotsRemaining: number;
}

export function FoundingPartnerForm({ spotsRemaining }: FoundingPartnerFormProps) {
    const [email, setEmail] = useState('');
    const [dispensaryName, setDispensaryName] = useState('');
    const [contactName, setContactName] = useState('');
    const [location, setLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [posSystem, setPosSystem] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const isClosed = spotsRemaining <= 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !dispensaryName.trim()) {
            setError('Email and dispensary name are required');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await captureNYLead({
                email: email.trim(),
                dispensaryName: dispensaryName.trim(),
                contactName: contactName.trim() || undefined,
                location: location.trim() || undefined,
                phone: phone.trim() || undefined,
                posSystem: posSystem.trim() || undefined,
                source: 'founding-partner',
                emailConsent: true,
                smsConsent: !!phone.trim(),
            });
            if (!result.success) {
                throw new Error(result.error || 'Failed to submit');
            }
            setSuccess(true);
        } catch (err: unknown) {
            const e = err as Error;
            setError(e.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 sticky top-24">
            {success ? (
                <div className="flex flex-col items-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Application Received!</h3>
                    <p className="text-slate-600 mb-4">
                        Thanks for applying to the NY Founding Partner Program.
                        Our team will review your application and reach out within 48 hours.
                    </p>
                    <div className="p-4 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                        <ShieldCheck className="w-4 h-4 inline mr-1" />
                        We&apos;ll reach out to <strong>{email}</strong>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <h3 className="text-xl font-bold">Apply for Founding Partner</h3>
                    </div>
                    {!isClosed && (
                        <div className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-6">
                            {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining out of 10
                        </div>
                    )}
                    {isClosed && (
                        <div className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-6">
                            All spots are claimed, but you can join the waitlist.
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="dispensaryName">Dispensary Name *</Label>
                            <Input
                                id="dispensaryName"
                                placeholder="Your dispensary name"
                                value={dispensaryName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDispensaryName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="contactName">Your Name</Label>
                                <Input
                                    id="contactName"
                                    placeholder="Full name"
                                    value={contactName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    placeholder="City, NY"
                                    value={location}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Work Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@dispensary.com"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone (optional)</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="(555) 123-4567"
                                value={phone}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="posSystem">Current POS System</Label>
                            <Input
                                id="posSystem"
                                placeholder="e.g. Alleaves, Dutchie, Treez"
                                value={posSystem}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPosSystem(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}

                        <Button type="submit" className="w-full h-12" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : isClosed ? (
                                'Join Waitlist'
                            ) : (
                                <>
                                    <Crown className="w-4 h-4 mr-2" />
                                    Apply for Founding Partner
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-center text-slate-400">
                            No commitment required. We&apos;ll review your application and reach out to discuss fit.
                        </p>
                    </form>
                </>
            )}
        </div>
    );
}
