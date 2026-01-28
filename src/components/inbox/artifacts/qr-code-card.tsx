'use client';

/**
 * QR Code Card
 *
 * Display component for QR code artifacts in inbox.
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    QrCode,
    Download,
    ExternalLink,
    Eye,
    Users,
    TrendingUp,
    Calendar,
    Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InboxArtifact } from '@/types/inbox';
import type { QRCode as QRCodeType } from '@/types/qr-code';
import { getQRCodeTypeLabel, getQRCodeStyleLabel } from '@/types/qr-code';
import { format, formatDistanceToNow } from 'date-fns';

interface InboxQRCodeCardProps {
    artifact: InboxArtifact;
    onClick?: () => void;
    className?: string;
}

export function InboxQRCodeCard({ artifact, onClick, className }: InboxQRCodeCardProps) {
    const qrCode = artifact.data as QRCodeType;

    const handleDownload = () => {
        if (qrCode.imageUrl) {
            const link = document.createElement('a');
            link.href = qrCode.imageUrl;
            link.download = `qr-${qrCode.shortCode}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleOpenTarget = () => {
        window.open(qrCode.targetUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                className={cn(
                    'bg-card/50 backdrop-blur-sm border-white/10 hover:border-white/20',
                    'transition-all duration-200 cursor-pointer',
                    onClick && 'hover:shadow-lg hover:scale-[1.01]',
                    className
                )}
                onClick={onClick}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <QrCode className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base font-semibold truncate">
                                    {qrCode.title}
                                </CardTitle>
                                {qrCode.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                        {qrCode.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Badge variant="secondary" className="capitalize text-xs">
                            {getQRCodeTypeLabel(qrCode.type)}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* QR Code Image */}
                    {qrCode.imageUrl && (
                        <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                            <img
                                src={qrCode.imageUrl}
                                alt={qrCode.title}
                                className="w-48 h-48 object-contain"
                            />
                        </div>
                    )}

                    {/* Short Code & Target URL */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Short Code</span>
                            <code className="px-2 py-1 rounded bg-muted font-mono">
                                {qrCode.shortCode}
                            </code>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <a
                                href={qrCode.targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {qrCode.targetUrl}
                            </a>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                {qrCode.totalScans.toLocaleString()} scans
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                {qrCode.uniqueScans.toLocaleString()} unique
                            </span>
                        </div>
                        {qrCode.lastScannedAt && (
                            <div className="flex items-center gap-2 text-xs col-span-2">
                                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                    Last scan {formatDistanceToNow(new Date(qrCode.lastScannedAt), { addSuffix: true })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Campaign & Tags */}
                    {(qrCode.campaign || qrCode.tags) && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                            {qrCode.campaign && (
                                <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/20 text-blue-400">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {qrCode.campaign}
                                </Badge>
                            )}
                            {qrCode.tags?.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Expiration */}
                    {qrCode.expiresAt && (
                        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                                Expires {format(new Date(qrCode.expiresAt), 'MMM d, yyyy')}
                            </span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-white/10 hover:bg-white/5"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload();
                            }}
                        >
                            <Download className="h-3.5 w-3.5 mr-2" />
                            Download
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-white/10 hover:bg-white/5"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTarget();
                            }}
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Open Link
                        </Button>
                    </div>

                    {/* AI Rationale */}
                    {artifact.rationale && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 text-xs">
                            <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                                AI Rationale
                            </div>
                            <p className="text-blue-900 dark:text-blue-300">
                                {artifact.rationale}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default InboxQRCodeCard;
