
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Skeleton } from '@/components/ui/skeleton';

export const QRDisplay = ({ text }: { text: string }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        if (text) {
            QRCode.toDataURL(text, {
                width: 200,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
            .then(url => {
                setQrCodeUrl(url);
            })
            .catch(err => {
                console.error('Failed to generate QR code:', err);
            });
        }
    }, [text]);

    if (!qrCodeUrl) {
        return <Skeleton className="h-48 w-48" />;
    }

    return <Image src={qrCodeUrl} alt="Order QR Code" width={192} height={192} className="rounded-lg" />;
};
