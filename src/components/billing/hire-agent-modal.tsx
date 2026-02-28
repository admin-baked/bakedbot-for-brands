'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createHireSubscription } from '@/server/actions/createHireSubscription';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Load Accept.js script dynamically or assume it's loaded in layout?
// For robust implementation, we'll assume it's available or load it.
// In a real app we might use a hook. 
// For this iteration, we'll do a simple form that sends data to backend - WAIT. 
// Sending card data directly to backend is PCI-DSS violation.
// We MUST use Accept.js / Opaque Data. 

// Adding a simple script loader for Accept.js if not present
const loadAcceptJs = () => {
    return new Promise((resolve) => {
        if ((window as any).Accept) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://jstest.authorize.net/v1/Accept.js';
        script.onload = () => resolve(true);
        document.body.appendChild(script);
    });
};

interface HireAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planId: 'specialist' | 'empire';
}

export function HireAgentModal({ isOpen, onClose, planId }: HireAgentModalProps) {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
    
    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        cardNum: '',
        expiry: '', // MM/YY
        cvv: '',
        zip: ''
    });

    const handleHire = async () => {
        setIsLoading(true);
        try {
            await loadAcceptJs();
            
            // 1. Tokenize Card Data (Accept.js)
            const clientKey = process.env.NEXT_PUBLIC_AUTHNET_CLIENT_KEY;
            const apiLoginID = process.env.NEXT_PUBLIC_AUTHNET_API_LOGIN_ID;
            if (!clientKey || !apiLoginID) {
                throw new Error('Authorize.Net public configuration missing');
            }

            const authData = {
                clientKey,
                apiLoginID,
            };

            const cardData = {
                cardNumber: formData.cardNum.replace(/\s/g, ''),
                month: formData.expiry.split('/')[0],
                year: formData.expiry.split('/')[1],
                cardCode: formData.cvv
            };

            const secureData = {
                authData,
                cardData
            };

            // Wrap Accept.dispatchData in promise
            const opaqueData = await new Promise<{ dataDescriptor: string; dataValue: string }>((resolve, reject) => {
                (window as any).Accept.dispatchData(secureData, (response: any) => {
                    if (response.messages.resultCode === 'Error') {
                        reject(response.messages.message[0].text);
                    } else {
                        resolve(response.opaqueData);
                    }
                });
            });

            // 2. Send Opaque Data to Backend
            const result = await createHireSubscription({
                userId: user?.uid || '',
                email: user?.email || '',
                firstName: formData.firstName,
                lastName: formData.lastName,
                planId,
                payment: {
                    opaqueData
                },
                zip: formData.zip
            });

            if (result.success) {
                setStep('success');
                setTimeout(onClose, 3000); // Auto close
            } else {
                toast({ title: 'Hiring Failed', description: result.error, variant: 'destructive' });
            }

        } catch (error: any) {
            console.error('Hiring Error:', error);
            toast({ title: 'Payment Failed', description: String(error), variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[425px]">
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold">You're Hired!</h2>
                        <p className="text-muted-foreground">Your {planId === 'specialist' ? 'AI Specialist' : 'Digital Empire'} is ready to work.</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Hire Your AI {planId === 'specialist' ? 'Specialist' : 'Team'}</DialogTitle>
                    <DialogDescription>
                        {planId === 'specialist' ? '$499/mo' : '$1,499/mo'} • Cancel anytime • Secure Billing
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input 
                                value={formData.firstName}
                                onChange={e => setFormData({...formData, firstName: e.target.value})}
                                placeholder="Jane"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input 
                                value={formData.lastName}
                                onChange={e => setFormData({...formData, lastName: e.target.value})}
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Card Number</Label>
                        <Input 
                            value={formData.cardNum}
                            onChange={e => setFormData({...formData, cardNum: e.target.value})}
                            placeholder="0000 0000 0000 0000"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Expiry (MM/YY)</Label>
                            <Input 
                                value={formData.expiry}
                                onChange={e => setFormData({...formData, expiry: e.target.value})}
                                placeholder="12/26"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CVV</Label>
                            <Input 
                                value={formData.cvv}
                                onChange={e => setFormData({...formData, cvv: e.target.value})}
                                placeholder="123"
                                type="password"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label>Zip</Label>
                            <Input 
                                value={formData.zip}
                                onChange={e => setFormData({...formData, zip: e.target.value})}
                                placeholder="90210"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <div className="flex flex-col w-full gap-2">
                        <Button onClick={handleHire} disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            {isLoading ? 'Processing...' : `Confirm Hire ($${planId === 'specialist' ? '499' : '1,499'}/mo)`}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Secure Payment via Authorize.net
                        </p>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
