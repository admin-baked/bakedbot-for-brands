/**
 * Payment Form Component with Stripe Elements
 */

'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentFormProps {
    amount: number;
    orderId: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export function PaymentForm({ amount, orderId, onSuccess, onError }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/order-confirmation/${orderId}`,
                },
            });

            if (error) {
                onError(error.message || 'Payment failed');
                toast({
                    title: 'Payment failed',
                    description: error.message,
                    variant: 'destructive',
                });
            } else {
                onSuccess();
            }
        } catch (err: any) {
            onError(err.message || 'An unexpected error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <PaymentElement />

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={!stripe || isProcessing}
                            className="w-full"
                        >
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Pay ${(amount / 100).toFixed(2)}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
