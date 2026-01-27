'use client';

/**
 * Creative QR Code Component
 *
 * Displays QR code for creative content with download and tracking features.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Download,
    Copy,
    ExternalLink,
    QrCode,
    TrendingUp,
    Eye,
} from 'lucide-react';
import { generateCreativeQR } from '@/lib/qr/creative-qr';
import { cn } from '@/lib/utils';
import type { CreativeContent } from '@/types/creative-content';

interface CreativeQRCodeProps {
    content: CreativeContent;
    size?: number;
    showStats?: boolean;
    showDownload?: boolean;
    className?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
    instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
    tiktok: 'bg-gradient-to-br from-black to-cyan-400',
    linkedin: 'bg-gradient-to-br from-blue-600 to-blue-800',
    twitter: 'bg-gradient-to-br from-blue-400 to-blue-600',
    facebook: 'bg-gradient-to-br from-blue-500 to-blue-700',
};

export function CreativeQRCode({
    content,
    size = 256,
    showStats = true,
    showDownload = true,
    className,
}: CreativeQRCodeProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(content.qrDataUrl || null);
    const [qrSvg, setQrSvg] = useState<string | null>(content.qrSvg || null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Generate QR if not already present
    useEffect(() => {
        if (!qrDataUrl) {
            setIsGenerating(true);
            generateCreativeQR({ contentId: content.id, size })
                .then((result) => {
                    if (result.success) {
                        setQrDataUrl(result.qrDataUrl || null);
                        setQrSvg(result.qrSvg || null);
                    }
                })
                .finally(() => setIsGenerating(false));
        }
    }, [content.id, qrDataUrl, size]);

    const handleCopyUrl = async () => {
        if (content.contentUrl) {
            await navigator.clipboard.writeText(content.contentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadPNG = (downloadSize: number) => {
        // Generate at requested size
        generateCreativeQR({ contentId: content.id, size: downloadSize }).then((result) => {
            if (result.success && result.qrDataUrl) {
                const link = document.createElement('a');
                link.href = result.qrDataUrl;
                link.download = `bakedbot-qr-${content.platform}-${downloadSize}.png`;
                link.click();
            }
        });
    };

    const handleDownloadSVG = () => {
        if (qrSvg) {
            const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bakedbot-qr-${content.platform}.svg`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleOpenLanding = () => {
        if (content.contentUrl) {
            window.open(content.contentUrl, '_blank');
        }
    };

    if (isGenerating) {
        return (
            <Card className={cn('w-full', className)}>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        <CardTitle>Trackable QR Code</CardTitle>
                    </div>
                    <CardDescription>Generating QR code...</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-64 mx-auto rounded-lg" />
                </CardContent>
            </Card>
        );
    }

    if (!qrDataUrl) {
        return null;
    }

    return (
        <Card className={cn('w-full', className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        <CardTitle>Trackable QR Code</CardTitle>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn('text-white border-0', PLATFORM_COLORS[content.platform] || 'bg-primary')}
                    >
                        {content.platform}
                    </Badge>
                </div>
                <CardDescription>
                    Scan to view content on landing page
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* QR Code Image */}
                <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl border-2 border-green-100 shadow-lg">
                        <img
                            src={qrDataUrl}
                            alt={`QR code for ${content.platform} content`}
                            width={size}
                            height={size}
                            className="rounded-lg"
                        />
                        <p className="text-center text-xs text-slate-500 mt-2 font-mono">
                            {content.id.substring(0, 8)}...
                        </p>
                    </div>
                </div>

                {/* Stats */}
                {showStats && content.qrStats && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Total Scans</p>
                                <p className="text-lg font-semibold">{content.qrStats.scans}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-xs text-muted-foreground">Last Scan</p>
                                <p className="text-sm font-medium">
                                    {content.qrStats.lastScanned
                                        ? new Date(content.qrStats.lastScanned).toLocaleDateString()
                                        : 'Never'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Caption Preview */}
                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Caption Preview:</p>
                    <p className="text-sm line-clamp-2">{content.caption}</p>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                    {/* Primary Actions */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={handleCopyUrl}
                        >
                            <Copy className="h-4 w-4 mr-2" />
                            {copied ? 'Copied!' : 'Copy URL'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={handleOpenLanding}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Page
                        </Button>
                    </div>

                    {/* Download Options */}
                    {showDownload && (
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground px-1">Download Options:</p>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleDownloadPNG(256)}
                                >
                                    <Download className="h-3 w-3 mr-1" />
                                    PNG 256
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleDownloadPNG(512)}
                                >
                                    <Download className="h-3 w-3 mr-1" />
                                    PNG 512
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1"
                                    onClick={handleDownloadSVG}
                                >
                                    <Download className="h-3 w-3 mr-1" />
                                    SVG
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
