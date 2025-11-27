// src/components/checkout/payment-smokey.tsx
/**
 * SmokeyPay (CannPay) Payment Component
 * For Dispensary Orders (Cannabis)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, QrCode, ExternalLink } from 'lucide-react';

type PaymentSmokeyProps = {
    amount: number;
    onSuccess: (paymentData: any) => void;
    onError: (error: string) => void;
};

export function PaymentSmokey({ amount, onSuccess, onError }: PaymentSmokeyProps) {
    const [loading, setLoading] = useState(false);

    const handleCannPay = async () => {
        setLoading(true);

        // Simulate CannPay Handoff / Link Generation
        await new Promise(resolve => setTimeout(resolve, 1500));

        // In a real integration, this might open a popup or redirect to CannPay
        // For now, we just confirm the "intent" to pay via CannPay
        onSuccess({
            method: 'cannpay',
            status: 'pending_payment', // Payment happens externally/at pickup
            provider: 'smokey_pay'
        });

        setLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                    <CardTitle>SmokeyPay (CannPay)</CardTitle>
                </div>
                <CardDescription>
                    Secure mobile payment for cannabis
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                    <QrCode className="h-6 w-6 text-blue-600 mt-1" />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium">How it works:</p>
                        <p>You'll receive a secure payment link via SMS or scan a QR code at pickup to complete your payment with CannPay.</p>
                    </div>
                </div>

                <Button
                    onClick={handleCannPay}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting to CannPay...
                        </>
                    ) : (
                        <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pay ${amount.toFixed(2)} with CannPay
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
