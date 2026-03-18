'use client';

// src/components/checkout/payment-smokey.tsx
/**
 * Smokey Pay Payment Component
 * Customer-facing brand: SmokeyPay | Internal: CannPay
 *
 * Calls POST /api/checkout/smokey-pay to create the CannPay intent,
 * then redirects to the CannPay widget URL (or internal confirmation).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, QrCode, ShieldCheck, ExternalLink } from 'lucide-react';
import type { CartItem } from '@/types/orders';

type PaymentSmokeyProps = {
    amount: number;
    orgId?: string;
    dispensaryId?: string;
    pickupLocationId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    cartItems?: CartItem[];
    onSuccess: (paymentData: unknown) => void;
    onError: (error: string) => void;
};

export function PaymentSmokey({
    amount,
    orgId,
    dispensaryId,
    pickupLocationId,
    customerName = '',
    customerEmail = '',
    customerPhone = '',
    cartItems = [],
    onSuccess,
    onError,
}: PaymentSmokeyProps) {
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const router = useRouter();

    const handleSmokeyPay = async () => {
        setLoading(true);
        setErrorMsg(null);

        // Fallback: if no orgId/dispensaryId, use legacy success path
        if (!orgId || !dispensaryId) {
            onSuccess({ method: 'cannpay', status: 'pending_payment', provider: 'smokey_pay' });
            setLoading(false);
            return;
        }

        try {
            const items = cartItems.map((item) => ({
                productId: item.id,
                name: item.name ?? '',
                quantity: item.quantity,
                unitPrice: item.price ?? 0,
            }));

            const subtotal = Number(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
            const tax = Number((subtotal * 0.15).toFixed(2));
            const total = Number((subtotal + tax).toFixed(2));

            const res = await fetch('/api/checkout/smokey-pay', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId: orgId,
                    dispensaryId,
                    pickupLocationId: pickupLocationId ?? dispensaryId,
                    customer: {
                        name: customerName,
                        email: customerEmail,
                        phone: customerPhone,
                    },
                    items,
                    subtotal,
                    tax,
                    fees: 0,
                    total,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error ?? 'Payment failed. Please try again.');
            }

            // Redirect to CannPay widget (external) or internal confirmation
            if (data.checkoutUrl?.startsWith('http')) {
                window.location.href = data.checkoutUrl;
            } else {
                router.push(data.checkoutUrl ?? `/order-confirmation/${data.orderId}`);
            }

            onSuccess({ method: 'cannpay', orderId: data.orderId, intentId: data.intentId });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unexpected error';
            setErrorMsg(msg);
            onError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-emerald-600" />
                    <CardTitle>SmokeyPay</CardTitle>
                </div>
                <CardDescription>
                    Fast, secure cannabis checkout — powered by SmokeyPay
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {errorMsg && (
                    <Alert variant="destructive">
                        <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                )}

                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-start gap-3">
                    <QrCode className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-emerald-900">
                        <p className="font-medium mb-0.5">How it works</p>
                        <p className="text-emerald-700 text-xs">Your order is confirmed now. You&apos;ll be redirected to complete secure payment via SmokeyPay.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>State-compliant cannabis payments · Age-verified · No card data stored</span>
                </div>

                <Button
                    onClick={handleSmokeyPay}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Preparing SmokeyPay...
                        </>
                    ) : (
                        <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pay ${amount.toFixed(2)} with SmokeyPay
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
