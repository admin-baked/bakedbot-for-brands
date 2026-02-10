'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, QrCode, Power, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    generateWhatsAppQRAction,
    disconnectWhatsAppAction,
    getWhatsAppSessionAction,
} from '@/server/actions/whatsapp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SessionCardProps {
    status: any;
    onRefresh: () => void;
}

export function SessionCard({ status, onRefresh }: SessionCardProps) {
    const { toast } = useToast();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Poll for connection status while QR dialog is open
    useEffect(() => {
        if (showQR) {
            // Start polling every 2 seconds
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const result = await getWhatsAppSessionAction();
                    if (result.success && result.data) {
                        const data = result.data as any;
                        if (data.connected) {
                            // Connected! Close dialog and refresh
                            setShowQR(false);
                            setQrCode(null);
                            toast({
                                title: "Connected!",
                                description: `WhatsApp linked to ${data.phoneNumber || 'your phone'}`,
                            });
                            onRefresh();
                        }
                    }
                } catch {
                    // Ignore polling errors
                }
            }, 2000);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [showQR, onRefresh, toast]);

    const handleGenerateQR = async () => {
        setLoading(true);
        try {
            const result = await generateWhatsAppQRAction();
            if (result.success && result.data) {
                const data = result.data as any;
                if (data.qrCode) {
                    setQrCode(data.qrCode);
                }
                setShowQR(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to generate QR",
                    description: result.error || 'Unknown error',
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        try {
            const result = await disconnectWhatsAppAction();
            if (result.success) {
                toast({
                    title: "Disconnected",
                    description: "WhatsApp session disconnected successfully",
                });
                onRefresh();
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to disconnect",
                    description: result.error || 'Unknown error',
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card className={status?.connected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {status?.connected ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                                <p className="font-medium">
                                    {status?.connected ? 'Connected' : 'Disconnected'}
                                </p>
                                {status?.phoneNumber && (
                                    <p className="text-sm text-muted-foreground">
                                        {status.phoneNumber}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!status?.connected && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateQR}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <QrCode className="h-4 w-4 mr-2" />
                                    )}
                                    Connect
                                </Button>
                            )}
                            {status?.connected && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleDisconnect}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Power className="h-4 w-4 mr-2" />
                                    )}
                                    Disconnect
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Dialog */}
            <Dialog open={showQR} onOpenChange={setShowQR}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Scan QR Code</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {qrCode && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={qrCode}
                                alt="WhatsApp QR Code"
                                width={300}
                                height={300}
                                className="border rounded-lg"
                            />
                        )}
                        <Alert>
                            <AlertDescription>
                                Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and scan this QR code.
                            </AlertDescription>
                        </Alert>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
