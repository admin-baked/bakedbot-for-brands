'use client';

/**
 * QR Code Component
 * 
 * Renders a QR code as an SVG or image using the 'qrcode' library.
 */

import { useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
    value: string;
    size?: number;
    className?: string;
    darkColor?: string;
    lightColor?: string;
}

export function QRCode({ 
    value, 
    size = 200, 
    className = '',
    darkColor = '#000000',
    lightColor = '#ffffff'
}: QRCodeProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        QRCodeLib.toDataURL(value, {
            width: size,
            margin: 2,
            color: {
                dark: darkColor,
                light: lightColor
            }
        }).then(url => {
            if (mounted) setDataUrl(url);
        }).catch(err => {
            console.error('[QRCode] Failed to generate', err);
        });
        return () => { mounted = false; };
    }, [value, size, darkColor, lightColor]);

    if (!dataUrl) {
        return (
            <div 
                className={`bg-gray-100 animate-pulse rounded-lg flex items-center justify-center ${className}`} 
                style={{ width: size, height: size }}
            >
                <div className="h-1/2 w-1/2 bg-gray-200 rounded" />
            </div>
        );
    }

    return (
        <img 
            src={dataUrl} 
            alt={`QR Code for ${value}`} 
            width={size} 
            height={size} 
            className={`rounded-lg ${className}`}
            style={{ width: size, height: size }}
        />
    );
}
