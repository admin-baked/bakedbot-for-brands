/**
 * Customer Delivery QR Code Display Page
 *
 * Public page — no authentication required.
 * Customers open this link (sent in the en-route SMS) to display the
 * delivery QR code that the driver scans at the door to confirm arrival.
 *
 * Route: /order-qr/[deliveryId]
 */

import type { Metadata } from 'next';
import { getPublicDeliveryQr } from '@/server/actions/delivery';
import { buildQrImageUrl } from '@/lib/delivery-qr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Your Delivery QR Code | BakedBot',
    description: 'Show this QR code to your delivery driver to confirm arrival.',
};

export default async function OrderQrPage({
    params,
}: {
    params: Promise<{ deliveryId: string }>;
}) {
    const { deliveryId } = await params;
    const result = await getPublicDeliveryQr(deliveryId);

    if (!result.success || !result.delivery) {
        return <QrErrorPage message="This QR code link is invalid or has expired." />;
    }

    const delivery = result.delivery;

    if (!delivery.deliveryQrCode) {
        return (
            <QrErrorPage message="Your QR code will be available once your order is confirmed for delivery." />
        );
    }

    if (delivery.status === 'delivered') {
        return <QrErrorPage message="This order has already been delivered. Thank you!" />;
    }

    const qrImageUrl = buildQrImageUrl(delivery.deliveryQrCode, 300);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="w-full max-w-sm space-y-4">
                <div className="text-center text-white">
                    <h1 className="text-2xl font-bold mb-1">Your Delivery QR Code</h1>
                    <p className="text-white/70 text-sm">
                        Show this to your driver when they arrive at your door
                    </p>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-center text-base">
                            Order #{delivery.orderId.slice(-8).toUpperCase()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4 pb-6">
                        {/* QR Code */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={qrImageUrl}
                            alt="Delivery QR Code"
                            width={300}
                            height={300}
                            className="rounded-xl border-4 border-slate-100 shadow-lg"
                        />

                        <div className="text-center">
                            <p className="text-sm font-medium">
                                {delivery.deliveryAddress.street}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state}
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 w-full">
                            <p className="text-xs text-amber-800 dark:text-amber-200 text-center leading-relaxed">
                                Keep this screen bright when your driver arrives.
                                They will scan this code to confirm delivery.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function QrErrorPage({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <Card className="w-full max-w-sm">
                <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">QR Code Unavailable</h3>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </CardContent>
            </Card>
        </div>
    );
}
