'use client';

// src/components/checkout/payment-smokey.tsx
/**
 * SmokeyPay payment component
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { createPaymentIntent, confirmPayment, isTestMode, type PaymentResult } from '@/lib/smokey-pay';

type PaymentSmokeyProps = {
    amount: number;
    onSuccess: (result: PaymentResult) => void;
    onError: (error: string) => void;
    metadata?: Record<string, any>;
};

export function PaymentSmokey({ amount, onSuccess, onError, metadata }: PaymentSmokeyProps) {
    const [loading, setLoading] = useState(false);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePayment = async () => {
        setLoading(true);
        setError(null);

        try {
            // Step 1: Create payment intent
            const intent = await createPaymentIntent(amount, metadata);
            setPaymentIntentId(intent.id);

            // Step 2: Confirm payment (in production, this would redirect to SmokeyPay)
            const result = await confirmPayment(intent.id);

            if (result.success) {
                onSuccess(result);
            } else {
                setError(result.error || 'Payment failed');
                onError(result.error || 'Payment failed');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Payment failed';
            setError(errorMessage);
            onError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle>SmokeyPay</CardTitle>
                    </div>
                    {isTestMode() && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Test Mode
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    Secure cannabis payment processing
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {isTestMode() && (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Running in test mode. No real payment will be processed.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Total Amount:</span>
                    </div>
                    <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
                </div>

                <Button
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing Payment...
                        </>
                    ) : (
                        <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay with SmokeyPay
                        </>
                    )}
                </Button>

                <div className="text-xs text-muted-foreground text-center space-y-1">
                    <p>Powered by SmokeyPay - Secure cannabis payments</p>
                    <p>Your payment information is encrypted and secure</p>
                </div>
            </CardContent>
        </Card>
    );
}
