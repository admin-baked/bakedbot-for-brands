'use client';

/**
 * QR Code Scanner Component
 *
 * Uses the browser's native BarcodeDetector API (Chrome/Android + Safari 16.4+).
 * Falls back to manual text entry for older browsers.
 *
 * Usage:
 *   <QrScanner onScan={(token) => handlePickupScan(token)} label="Scan Pickup QR" />
 *   <QrScanner onScan={(token) => handleDeliveryScan(token)} label="Scan Customer QR" />
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { QrCode, X, Keyboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QrScannerProps {
    /** Called with the raw QR token string when a code is successfully scanned */
    onScan: (token: string) => void;
    disabled?: boolean;
    label?: string;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        BarcodeDetector: any;
    }
}

export function QrScanner({ onScan, disabled, label = 'Scan QR Code' }: QrScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { toast } = useToast();

    const hasBarcodeDetector =
        typeof window !== 'undefined' && 'BarcodeDetector' in window;

    const stopCamera = useCallback(() => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setScanning(false);
    }, []);

    const startCamera = async () => {
        if (!hasBarcodeDetector) {
            setShowManual(true);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setScanning(true);

            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

            // Poll every 250ms for a QR code in the video feed
            scanIntervalRef.current = setInterval(async () => {
                if (!videoRef.current) return;
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0 && barcodes[0].rawValue) {
                        const token = barcodes[0].rawValue as string;
                        stopCamera();
                        setIsOpen(false);
                        onScan(token);
                    }
                } catch {
                    // Per-frame detection failures are normal — ignore
                }
            }, 250);
        } catch {
            toast({
                variant: 'destructive',
                title: 'Camera Error',
                description: 'Could not access camera. Please enter the code manually.',
            });
            stopCamera();
            setShowManual(true);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        setShowManual(!hasBarcodeDetector);
        if (hasBarcodeDetector) {
            startCamera();
        }
    };

    const handleClose = () => {
        stopCamera();
        setIsOpen(false);
        setShowManual(false);
        setManualCode('');
    };

    const handleManualSubmit = () => {
        if (!manualCode.trim()) return;
        onScan(manualCode.trim());
        setManualCode('');
        setIsOpen(false);
    };

    return (
        <>
            <Button
                onClick={handleOpen}
                disabled={disabled}
                className="w-full"
                variant="outline"
                size="lg"
            >
                <QrCode className="mr-2 h-5 w-5" />
                {label}
            </Button>

            {isOpen && (
                <Card className="border-2 border-primary mt-3">
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{label}</span>
                            <Button variant="ghost" size="icon" onClick={handleClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Camera viewfinder */}
                        {scanning && !showManual && (
                            <div className="relative">
                                <video
                                    ref={videoRef}
                                    className="w-full rounded-lg aspect-square object-cover bg-black"
                                    muted
                                    playsInline
                                />
                                {/* Targeting reticle */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-48 h-48 border-2 border-white rounded-lg opacity-80" />
                                </div>
                                <p className="text-center text-xs text-muted-foreground mt-2">
                                    Point camera at QR code
                                </p>
                            </div>
                        )}

                        {/* Manual fallback */}
                        {showManual && (
                            <div className="space-y-2">
                                <Label htmlFor="qr-manual-code">Enter code manually:</Label>
                                <Input
                                    id="qr-manual-code"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    onKeyDown={(e) =>
                                        e.key === 'Enter' && handleManualSubmit()
                                    }
                                    placeholder="Paste or type QR code value"
                                    autoFocus
                                />
                                <Button
                                    onClick={handleManualSubmit}
                                    disabled={!manualCode.trim()}
                                    className="w-full"
                                >
                                    Confirm Code
                                </Button>
                            </div>
                        )}

                        {/* Switch to manual while camera is active */}
                        {scanning && !showManual && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => {
                                    stopCamera();
                                    setShowManual(true);
                                }}
                            >
                                <Keyboard className="mr-1 h-3 w-3" />
                                Enter code manually instead
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
}
