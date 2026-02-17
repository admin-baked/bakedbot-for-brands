'use client';

/**
 * Loyalty Tablet QR Code Generator
 *
 * Dashboard page for dispensary staff to generate and print the QR code
 * that customers scan to join the loyalty program on their own phones.
 *
 * Access: /dashboard/loyalty-tablet-qr (dispensary role)
 */

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LoyaltyTabletQRPage() {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [orgId, setOrgId] = useState('org_thrive_syracuse');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Detect orgId from user session (uses window.location for now, proper auth in production)
    useEffect(() => {
        const storedOrgId = localStorage.getItem('bb_orgId') || 'org_thrive_syracuse';
        setOrgId(storedOrgId);
    }, []);

    const tabletUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/loyalty-tablet?orgId=${orgId}`
        : `https://bakedbot.ai/loyalty-tablet?orgId=${orgId}`;

    useEffect(() => {
        if (!orgId) return;
        QRCode.toDataURL(tabletUrl, {
            width: 400,
            margin: 2,
            color: { dark: '#1a0030', light: '#ffffff' },
            errorCorrectionLevel: 'H',
        }).then(setQrDataUrl).catch(console.error);
    }, [orgId, tabletUrl]);

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `thrive-loyalty-qr.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !qrDataUrl) return;
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Thrive Loyalty QR Code</title>
                <style>
                    body { font-family: sans-serif; text-align: center; padding: 40px; }
                    img { width: 300px; height: 300px; display: block; margin: 0 auto 20px; }
                    h1 { font-size: 28px; font-weight: 900; color: #1a0030; margin-bottom: 8px; }
                    p { font-size: 16px; color: #555; margin: 4px 0; }
                    .instructions { margin-top: 20px; font-size: 14px; color: #888; }
                </style>
            </head>
            <body>
                <h1>Join Our Loyalty Program</h1>
                <p>Scan with your phone to earn points on every purchase</p>
                <img src="${qrDataUrl}" alt="Loyalty QR Code" />
                <p style="font-size: 12px; color: #aaa;">${tabletUrl}</p>
                <div class="instructions">
                    <p>📱 Open your camera app and point it at the code</p>
                    <p>✅ No app download required</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="container max-w-4xl py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <QrCode className="h-8 w-8 text-purple-600" />
                    Loyalty Tablet QR Code
                </h1>
                <p className="text-muted-foreground mt-1">
                    Print or display this QR code at your counter. Customers scan it to join your loyalty program on their phone.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR Code Display */}
                <Card className="flex flex-col items-center p-8 bg-gradient-to-br from-purple-50 to-white border-purple-200">
                    {qrDataUrl ? (
                        <img
                            src={qrDataUrl}
                            alt="Loyalty Program QR Code"
                            className="w-64 h-64 rounded-2xl shadow-lg"
                        />
                    ) : (
                        <div className="w-64 h-64 bg-gray-100 rounded-2xl animate-pulse" />
                    )}
                    <p className="text-sm text-muted-foreground mt-4 text-center break-all px-4">{tabletUrl}</p>
                </Card>

                {/* Instructions & Actions */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">How it works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {[
                                { icon: '📱', step: 'Customer scans the QR code' },
                                { icon: '✍️', step: 'They enter name, phone & email' },
                                { icon: '✅', step: 'Automatically added to loyalty program' },
                                { icon: '🎁', step: 'Welcome offer sent immediately' },
                            ].map(item => (
                                <div key={item.step} className="flex items-start gap-3">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-muted-foreground">{item.step}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Placement Tips</CardTitle>
                            <CardDescription>Where to put this QR code</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-muted-foreground">
                            <p>🏪 Counter table tent (print 4×4 inches)</p>
                            <p>🖥️ Digital screen near checkout</p>
                            <p>📋 Front door / check-in area</p>
                            <p>💳 Include on receipts</p>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button onClick={handleDownload} disabled={!qrDataUrl} className="flex-1 gap-2">
                            <Download className="h-4 w-4" /> Download PNG
                        </Button>
                        <Button onClick={handlePrint} variant="outline" disabled={!qrDataUrl} className="flex-1 gap-2">
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        className="w-full gap-2 text-purple-600"
                        onClick={() => window.open(tabletUrl, '_blank')}
                    >
                        <ExternalLink className="h-4 w-4" /> Preview Tablet Flow
                    </Button>
                </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 shrink-0">Tip</Badge>
                        <p className="text-sm text-blue-800">
                            You can also use <strong>/loyalty-tablet</strong> directly on a dedicated iPad at the counter.
                            The tablet flow auto-resets after each customer, no touchscreen keyboard required.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
