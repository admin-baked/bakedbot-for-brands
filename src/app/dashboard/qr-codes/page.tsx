'use client';

/**
 * QR Codes Management Page
 *
 * View, manage, and track all QR codes with analytics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    QrCode,
    Download,
    Eye,
    Users,
    TrendingUp,
    Calendar,
    Tag,
    ExternalLink,
    Edit2,
    Trash2,
    Plus,
    Search,
    Filter,
} from 'lucide-react';
import { getQRCodes, deleteQRCode, getQRCodeAnalytics } from '@/server/actions/qr-code';
import type { QRCode as QRCodeType, QRCodeAnalytics } from '@/types/qr-code';
import { getQRCodeTypeLabel } from '@/types/qr-code';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { updateQRCode } from '@/server/actions/qr-code';

export default function QRCodesPage() {
    const [qrCodes, setQrCodes] = useState<QRCodeType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQR, setSelectedQR] = useState<QRCodeType | null>(null);
    const [analytics, setAnalytics] = useState<QRCodeAnalytics | null>(null);
    const [editingQR, setEditingQR] = useState<QRCodeType | null>(null);
    const [editUrl, setEditUrl] = useState('');

    useEffect(() => {
        loadQRCodes();
    }, []);

    const loadQRCodes = async () => {
        setLoading(true);
        const result = await getQRCodes({ limit: 100 });
        console.log('[QRCodesPage] Load result:', result);
        if (result.success && result.qrCodes) {
            console.log('[QRCodesPage] Loaded QR codes:', result.qrCodes.length);
            setQrCodes(result.qrCodes);
        } else {
            console.error('[QRCodesPage] Failed to load QR codes:', result.error);
        }
        setLoading(false);
    };

    const handleViewAnalytics = async (qrCode: QRCodeType) => {
        setSelectedQR(qrCode);
        const result = await getQRCodeAnalytics(qrCode.id);
        if (result.success && result.analytics) {
            setAnalytics(result.analytics);
        }
    };

    const handleEdit = (qrCode: QRCodeType) => {
        setEditingQR(qrCode);
        setEditUrl(qrCode.targetUrl);
    };

    const handleSaveEdit = async () => {
        if (!editingQR || !editUrl.trim()) return;

        const result = await updateQRCode(editingQR.id, {
            targetUrl: editUrl,
        });

        if (result.success) {
            // Reload QR codes
            await loadQRCodes();
            setEditingQR(null);
        }
    };

    const handleDelete = async (qrCodeId: string) => {
        if (!confirm('Are you sure you want to delete this QR code?')) return;

        const result = await deleteQRCode(qrCodeId);
        if (result.success) {
            await loadQRCodes();
        }
    };

    const handleDownload = (qrCode: QRCodeType) => {
        if (!qrCode.imageUrl) return;

        const link = document.createElement('a');
        link.href = qrCode.imageUrl;
        link.download = `qr-${qrCode.shortCode}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredQRCodes = qrCodes.filter((qr) =>
        qr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.targetUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qr.campaign?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                            <QrCode className="h-8 w-8 text-blue-400" />
                        </div>
                        QR Codes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and track your marketing QR codes
                    </p>
                </div>
                <Button onClick={() => window.location.href = '/dashboard/inbox'} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create QR Code
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total QR Codes</p>
                                <p className="text-2xl font-bold">{qrCodes.length}</p>
                            </div>
                            <QrCode className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Scans</p>
                                <p className="text-2xl font-bold">
                                    {qrCodes.reduce((sum, qr) => sum + qr.totalScans, 0).toLocaleString()}
                                </p>
                            </div>
                            <Eye className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                                <p className="text-2xl font-bold">
                                    {new Set(qrCodes.filter(qr => qr.campaign).map(qr => qr.campaign)).size}
                                </p>
                            </div>
                            <Tag className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Scans/QR</p>
                                <p className="text-2xl font-bold">
                                    {qrCodes.length > 0
                                        ? Math.round(qrCodes.reduce((sum, qr) => sum + qr.totalScans, 0) / qrCodes.length)
                                        : 0}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title, URL, or campaign..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Codes Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading QR codes...</p>
                </div>
            ) : filteredQRCodes.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            {searchQuery ? 'No QR codes match your search' : 'No QR codes yet'}
                        </p>
                        <Button
                            onClick={() => window.location.href = '/dashboard/inbox'}
                            className="mt-4"
                        >
                            Create Your First QR Code
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredQRCodes.map((qrCode) => (
                        <Card key={qrCode.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base truncate">{qrCode.title}</CardTitle>
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                            {getQRCodeTypeLabel(qrCode.type)}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* QR Code Image */}
                                {qrCode.imageUrl && (
                                    <div className="flex justify-center bg-white rounded-lg p-4">
                                        <img
                                            src={qrCode.imageUrl}
                                            alt={qrCode.title}
                                            className="w-32 h-32 object-contain"
                                        />
                                    </div>
                                )}

                                {/* Target URL */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Target URL</p>
                                    <div className="flex items-center gap-2">
                                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                        <a
                                            href={qrCode.targetUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline truncate"
                                        >
                                            {qrCode.targetUrl}
                                        </a>
                                    </div>
                                </div>

                                {/* Short Code */}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Tracking URL</p>
                                    <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                                        {process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai'}/qr/{qrCode.shortCode}
                                    </code>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1">
                                        <Eye className="h-3 w-3 text-muted-foreground" />
                                        <span>{qrCode.totalScans} scans</span>
                                    </div>
                                    {qrCode.lastScannedAt && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 text-muted-foreground" />
                                            <span>{formatDistanceToNow(new Date(qrCode.lastScannedAt), { addSuffix: true })}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Campaign Tag */}
                                {qrCode.campaign && (
                                    <Badge variant="outline" className="text-xs">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {qrCode.campaign}
                                    </Badge>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewAnalytics(qrCode)}
                                        className="flex-1"
                                    >
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        Analytics
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(qrCode)}
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownload(qrCode)}
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDelete(qrCode.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Analytics Dialog */}
            <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>QR Code Analytics: {selectedQR?.title}</DialogTitle>
                    </DialogHeader>
                    {analytics && (
                        <div className="space-y-4">
                            {/* Overview Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-muted-foreground">Total Scans</p>
                                        <p className="text-2xl font-bold">{analytics.totalScans}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-muted-foreground">Unique Scans</p>
                                        <p className="text-2xl font-bold">{analytics.uniqueScans}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Device Breakdown */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Scans by Device</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(analytics.scansByDevice).map(([device, count]) => (
                                            <div key={device} className="flex items-center justify-between">
                                                <span className="text-sm capitalize">{device}</span>
                                                <span className="text-sm font-medium">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Location Breakdown */}
                            {Object.keys(analytics.scansByLocation).length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Scans by Location</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {Object.entries(analytics.scansByLocation)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 5)
                                                .map(([location, count]) => (
                                                    <div key={location} className="flex items-center justify-between">
                                                        <span className="text-sm">{location}</span>
                                                        <span className="text-sm font-medium">{count}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingQR} onOpenChange={() => setEditingQR(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit QR Code</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-url">Target URL</Label>
                            <Input
                                id="edit-url"
                                type="url"
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Update where this QR code redirects to
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSaveEdit} className="flex-1">
                                Save Changes
                            </Button>
                            <Button variant="outline" onClick={() => setEditingQR(null)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
