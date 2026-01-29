'use client';

/**
 * Inline QR Code Generator
 *
 * Interactive QR code creation tool that appears inline in the chat conversation.
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import QRCodeLib from 'qrcode';

interface QRCodeGeneratorInlineProps {
    onComplete?: (qrCodeData: {
        url: string;
        campaignName: string;
        foregroundColor: string;
        backgroundColor: string;
        imageDataUrl: string;
    }) => void;
    initialUrl?: string;
    className?: string;
}

export function QRCodeGeneratorInline({ onComplete, initialUrl = '', className }: QRCodeGeneratorInlineProps) {
    const [url, setUrl] = useState(initialUrl);
    const [campaignName, setCampaignName] = useState('');
    const [foregroundColor, setForegroundColor] = useState('#000000');
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateQRCode = async () => {
        if (!url.trim()) {
            alert('Please enter a URL or text content.');
            return;
        }

        if (!canvasRef.current) return;

        setIsGenerating(true);

        try {
            // Generate QR code using the npm package
            await QRCodeLib.toCanvas(canvasRef.current, url, {
                width: 256,
                margin: 2,
                color: {
                    dark: foregroundColor,
                    light: backgroundColor,
                },
                errorCorrectionLevel: 'H',
            });

            // Get the data URL from the canvas
            const dataUrl = canvasRef.current.toDataURL('image/png');
            setQrCodeImage(dataUrl);
            setIsGenerating(false);
        } catch (error) {
            console.error('Error generating QR code:', error);
            alert('Error generating QR code. Please try again.');
            setIsGenerating(false);
        }
    };

    const downloadQRCode = () => {
        if (!qrCodeImage) return;

        let filename = campaignName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
        if (!filename) {
            filename = 'qrcode_generated';
        }
        filename += '.png';

        const link = document.createElement('a');
        link.href = qrCodeImage;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleComplete = () => {
        if (!qrCodeImage || !url) return;

        onComplete?.({
            url,
            campaignName,
            foregroundColor,
            backgroundColor,
            imageDataUrl: qrCodeImage,
        });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && url.trim()) {
            generateQRCode();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('w-full my-2', className)}
        >
            <Card className="bg-card/50 backdrop-blur-sm border-white/10">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                            <QrCode className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">QR Code Creator</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Create a custom QR code for your campaign
                            </p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-6">
                    {/* URL Input */}
                    <div className="space-y-2">
                        <Label htmlFor="qr-url" className="text-sm font-semibold">
                            Website URL or Text Content
                        </Label>
                        <Input
                            id="qr-url"
                            type="text"
                            placeholder="e.g., https://ecstaticedibles.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="bg-background/50 border-white/10"
                        />
                    </div>

                    {/* Campaign Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="campaign-name" className="text-sm font-semibold">
                            Campaign Name <span className="text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Input
                            id="campaign-name"
                            type="text"
                            placeholder="e.g., Comedy Show 1/28/26"
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            className="bg-background/50 border-white/10"
                        />
                    </div>

                    {/* Color Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="foreground-color" className="text-sm font-semibold">
                                Foreground Color
                            </Label>
                            <Input
                                id="foreground-color"
                                type="color"
                                value={foregroundColor}
                                onChange={(e) => setForegroundColor(e.target.value)}
                                className="h-12 w-full cursor-pointer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="background-color" className="text-sm font-semibold">
                                Background Color
                            </Label>
                            <Input
                                id="background-color"
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => setBackgroundColor(e.target.value)}
                                className="h-12 w-full cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={generateQRCode}
                        disabled={isGenerating || !url.trim()}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isGenerating ? 'Generating...' : 'Generate QR Code'}
                    </Button>

                    {/* QR Code Display */}
                    <div
                        className={cn(
                            'min-h-[280px] rounded-lg border-2 border-dashed border-white/10',
                            'flex items-center justify-center relative',
                            qrCodeImage ? 'bg-white' : 'bg-muted/30'
                        )}
                    >
                        {/* Canvas - always present */}
                        <canvas
                            ref={canvasRef}
                            className={cn(
                                'max-w-full h-auto p-4',
                                !qrCodeImage && 'hidden'
                            )}
                        />

                        {/* Placeholder text - only shown when no QR code */}
                        {!qrCodeImage && (
                            <div className="text-center text-muted-foreground italic text-sm p-4">
                                {!url.trim() ? (
                                    'Enter a URL above to get started'
                                ) : (
                                    'Click Generate to create your QR code'
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    {qrCodeImage && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2"
                        >
                            <Button
                                variant="outline"
                                onClick={downloadQRCode}
                                className="flex-1 border-white/10 hover:bg-white/5"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download PNG
                            </Button>
                            {onComplete && (
                                <Button
                                    onClick={handleComplete}
                                    className="flex-1 bg-green-500 hover:bg-green-600"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Done
                                </Button>
                            )}
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
