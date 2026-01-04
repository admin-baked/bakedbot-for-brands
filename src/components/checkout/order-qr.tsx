'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderQRProps {
    orderId: string;
    size?: number;
}

/**
 * Order QR Code Component
 * Generates a QR code that budtenders can scan to view/complete an order
 * Links to /scan/{orderId}
 */
export function OrderQR({ orderId, size = 200 }: OrderQRProps) {
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    useEffect(() => {
        // Generate QR Code pointing to the scan page
        const url = `${window.location.origin}/scan/${orderId}`;
        
        QRCode.toDataURL(url, {
            width: size,
            margin: 2,
            color: {
                dark: '#166534', // green-800
                light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
        })
        .then(setQrUrl)
        .catch(err => console.error('QR Gen Error:', err));
    }, [orderId, size]);

    if (!qrUrl) {
        return <Skeleton className="rounded-xl" style={{ width: size, height: size }} />;
    }

    return (
        <Card className="p-4 bg-white inline-block shadow-lg border-2 border-emerald-100">
            <img 
                src={qrUrl} 
                alt="Order Pickup QR Code" 
                width={size} 
                height={size}
                className="rounded-lg" 
            />
        </Card>
    );
}
