'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PassportQRProps {
    userId: string;
    size?: number;
}

export function PassportQR({ userId, size = 200 }: PassportQRProps) {
    const [qrUrl, setQrUrl] = useState<string | null>(null);

    useEffect(() => {
        // Generate QR Code pointing to the public profile page
        const url = `${window.location.origin}/p/${userId}`;
        
        QRCode.toDataURL(url, {
            width: size,
            margin: 2,
            color: {
                dark: '#166534', // green-800
                light: '#ffffff'
            }
        })
        .then(setQrUrl)
        .catch(err => console.error('QR Gen Error:', err));
    }, [userId, size]);

    if (!qrUrl) {
        return <Skeleton className="h-[200px] w-[200px] rounded-xl" />;
    }

    return (
        <Card className="p-4 bg-white inline-block shadow-lg border-2 border-green-100">
            <img 
                src={qrUrl} 
                alt="My Passport QR Code" 
                width={size} 
                height={size}
                className="rounded-lg" 
            />
            <p className="text-center text-xs text-slate-500 mt-2 font-mono">
                {userId.substring(0, 8)}...
            </p>
        </Card>
    );
}
