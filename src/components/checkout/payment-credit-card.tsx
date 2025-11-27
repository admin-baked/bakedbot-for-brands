// src/components/checkout/payment-credit-card.tsx
/**
 * Credit Card Payment Component (Authorize.net)
 * For Hemp Brands and Subscriptions ONLY.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Lock, ShieldCheck } from 'lucide-react';

type PaymentCreditCardProps = {
    amount: number;
    onSuccess: (paymentData: any) => void;
    onError: (error: string) => void;
};

export function PaymentCreditCard({ amount, onSuccess, onError }: PaymentCreditCardProps) {
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

        if (!cardData.cardNumber || !cardData.expirationDate || !cardData.cvv) {
            onError('Please fill in all payment details');
            setLoading(false);
            return;
        }

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Pass data to server action (Authorize.net)
        onSuccess({
            method: 'authorize_net',
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
                        <CardTitle>Credit Card</CardTitle>
                    </div>
                    <div className="flex items-center text-green-600 text-xs font-medium">
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Secure
                    </div>
                </div>
                <CardDescription>
                    Pay securely with credit card (Hemp/CBD only)
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
                        <Button type="submit" disabled={loading} className="w-full" size="lg">
                            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                            Pay ${amount.toFixed(2)}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
