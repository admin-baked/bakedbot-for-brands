// src/components/checkout/payment-smokey.tsx
/**
 * Payment component for Authorize.net
 * Collects card details for processing
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Lock, ShieldCheck } from 'lucide-react';

type PaymentSmokeyProps = {
    amount: number;
    onSuccess: (paymentData: any) => void;
    onError: (error: string) => void;
    metadata?: Record<string, any>;
};

export function PaymentSmokey({ amount, onSuccess, onError }: PaymentSmokeyProps) {
    const [loading, setLoading] = useState(false);
    const [cardData, setCardData] = useState({
        cardNumber: '',
        expirationDate: '',
        cvv: '',
        zip: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setCardData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (!cardData.cardNumber || !cardData.expirationDate || !cardData.cvv) {
            onError('Please fill in all payment details');
            setLoading(false);
            return;
        }

        // Simulate processing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Pass raw card data to server action (Note: In production, use Accept.js to tokenize first!)
        onSuccess({
            cardNumber: cardData.cardNumber.replace(/\s/g, ''),
            expirationDate: cardData.expirationDate,
            cvv: cardData.cvv,
            zip: cardData.zip
        });

        setLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle>Secure Payment</CardTitle>
                    </div>
                    <div className="flex items-center text-green-600 text-xs font-medium">
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Encrypted
                    </div>
                </div>
                <CardDescription>
                    Enter your card details to complete purchase
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <div className="relative">
                            <Input
                                id="cardNumber"
                                placeholder="0000 0000 0000 0000"
                                value={cardData.cardNumber}
                                onChange={handleInputChange}
                                maxLength={19}
                                required
                            />
                            <CreditCard className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="expirationDate">Expires</Label>
                            <Input
                                id="expirationDate"
                                placeholder="MM/YY"
                                value={cardData.expirationDate}
                                onChange={handleInputChange}
                                maxLength={5}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cvv">CVC</Label>
                            <Input
                                id="cvv"
                                placeholder="123"
                                value={cardData.cvv}
                                onChange={handleInputChange}
                                maxLength={4}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="zip">Zip Code</Label>
                            <Input
                                id="zip"
                                placeholder="12345"
                                value={cardData.zip}
                                onChange={handleInputChange}
                                maxLength={5}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing ${amount.toFixed(2)}...
                                </>
                            ) : (
                                <>
                                    <Lock className="h-4 w-4 mr-2" />
                                    Pay ${amount.toFixed(2)}
                                </>
                            )}
                        </Button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                        Payments processed securely via Authorize.net
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}
