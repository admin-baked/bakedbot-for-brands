// src/app/dashboard/products/url-import/url-import-client.tsx
'use client';

/**
 * URL Import Client Component
 * 
 * Provides a full-page experience for importing products from a URL.
 * Based on the MenuImportDialog from demo-shop but as a standalone page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
    Upload,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Globe,
    Package,
    Palette,
    Sparkles,
    ArrowRight,
    ArrowLeft,
    Import,
} from 'lucide-react';
import Link from 'next/link';
import type { MenuExtraction, ExtractedProduct } from '@/app/api/demo/import-menu/route';
import { saveImportedProducts } from '../actions';

type ImportStatus = 'idle' | 'validating' | 'extracting' | 'processing' | 'complete' | 'saving' | 'error';

export function UrlImportClient() {
    const router = useRouter();
    const { toast } = useToast();
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<MenuExtraction | null>(null);

    const handleImport = async () => {
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setError('Please enter a valid URL (e.g., https://example.com/menu)');
            return;
        }

        setError(null);
        setStatus('validating');
        setProgress(10);

        try {
            // Simulate validation step
            await new Promise((r) => setTimeout(r, 500));
            setStatus('extracting');
            setProgress(30);

            const response = await fetch('/api/demo/import-menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            setProgress(70);
            setStatus('processing');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to import menu');
            }

            const result = await response.json();
            setProgress(100);
            setStatus('complete');
            setPreview(result.data);
        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        }
    };

    const handleSaveToAccount = async () => {
        if (!preview) return;

        setStatus('saving');
        try {
            const result = await saveImportedProducts(preview.products);
            
            if (result.success) {
                toast({
                    title: 'Products Imported!',
                    description: `Successfully imported ${result.count} products to your catalog.`,
                });
                router.push('/dashboard/products');
            } else {
                throw new Error(result.error || 'Failed to save products');
            }
        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Failed to save products');
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: err instanceof Error ? err.message : 'Failed to save products',
            });
        }
    };

    const resetState = () => {
        setUrl('');
        setStatus('idle');
        setProgress(0);
        setError(null);
        setPreview(null);
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'validating':
                return 'Validating URL...';
            case 'extracting':
                return 'Extracting menu data with AI...';
            case 'processing':
                return 'Processing products and brand info...';
            case 'complete':
                return 'Import complete!';
            case 'saving':
                return 'Saving products to your account...';
            default:
                return '';
        }
    };

    // Group products by category for preview
    const categoryCounts = preview?.products.reduce(
        (acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <Link href="/dashboard/products">
                        <Button variant="ghost" size="sm" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Products
                        </Button>
                    </Link>
                </div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                    Import Your Menu
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Enter your website URL and we&apos;ll extract your products to add to your BakedBot catalog.
                </p>
            </div>

            {/* Main Content */}
            {status === 'idle' || status === 'error' ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Enter Your Menu URL
                        </CardTitle>
                        <CardDescription>
                            Works with Dutchie, Jane, Weedmaps, iHeartJane, and most dispensary websites
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="url">Your Menu URL</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="url"
                                        placeholder="https://yourdispensary.com/menu"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="pl-10 h-12"
                                        onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                                    />
                                </div>
                                <Button onClick={handleImport} disabled={!url.trim()} size="lg" className="gap-2">
                                    <Upload className="h-4 w-4" />
                                    Import
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                            <h4 className="font-medium">What we&apos;ll extract:</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-green-600" />
                                    Products with prices, THC/CBD, categories
                                </li>
                                <li className="flex items-center gap-2">
                                    <Palette className="h-4 w-4 text-purple-600" />
                                    Brand colors and logo
                                </li>
                                <li className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-600" />
                                    Current deals and promotions
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            ) : status === 'complete' && preview ? (
                <Card>
                    <CardHeader>
                        <Alert className="bg-green-50 border-green-200 mb-4">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Successfully extracted {preview.products.length} products from {preview.dispensary.name || 'your menu'}!
                            </AlertDescription>
                        </Alert>
                        <CardTitle>Review Your Products</CardTitle>
                        <CardDescription>
                            Review the extracted products before adding them to your catalog.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Brand Preview */}
                        <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                {preview.dispensary.logoUrl && (
                                    <img
                                        src={preview.dispensary.logoUrl}
                                        alt="Logo"
                                        className="h-12 w-12 rounded-lg object-contain bg-white border"
                                    />
                                )}
                                <div>
                                    <h3 className="font-semibold">{preview.dispensary.name || 'Your Brand'}</h3>
                                    {preview.dispensary.tagline && (
                                        <p className="text-sm text-muted-foreground">{preview.dispensary.tagline}</p>
                                    )}
                                </div>
                            </div>

                            {/* Brand Colors */}
                            {(preview.dispensary.primaryColor || preview.dispensary.secondaryColor) && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Brand Colors:</span>
                                    {preview.dispensary.primaryColor && (
                                        <div
                                            className="h-6 w-6 rounded-full border"
                                            style={{ backgroundColor: preview.dispensary.primaryColor }}
                                            title={preview.dispensary.primaryColor}
                                        />
                                    )}
                                    {preview.dispensary.secondaryColor && (
                                        <div
                                            className="h-6 w-6 rounded-full border"
                                            style={{ backgroundColor: preview.dispensary.secondaryColor }}
                                            title={preview.dispensary.secondaryColor}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Product Categories */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Products by Category</h4>
                            <div className="flex flex-wrap gap-2">
                                {categoryCounts &&
                                    Object.entries(categoryCounts).map(([category, count]) => (
                                        <Badge key={category} variant="secondary">
                                            {category}: {count}
                                        </Badge>
                                    ))}
                            </div>
                        </div>

                        {/* Sample Products */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Sample Products</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {preview.products.slice(0, 6).map((product, i) => (
                                    <div key={i} className="border rounded-lg p-3 text-sm">
                                        <div className="font-medium truncate">{product.name}</div>
                                        <div className="text-muted-foreground text-xs">{product.category}</div>
                                        {product.price && (
                                            <div className="font-semibold text-green-600 mt-1">
                                                ${product.price.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {preview.products.length > 6 && (
                                <p className="text-sm text-muted-foreground">
                                    +{preview.products.length - 6} more products
                                </p>
                            )}
                        </div>

                        {/* Promotions */}
                        {preview.promotions && preview.promotions.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm">Promotions Found</h4>
                                <div className="space-y-1">
                                    {preview.promotions.slice(0, 3).map((promo, i) => (
                                        <div key={i} className="text-sm bg-muted/50 rounded px-3 py-2">
                                            <span className="font-medium">{promo.title}</span>
                                            {promo.subtitle && (
                                                <span className="text-muted-foreground"> - {promo.subtitle}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={resetState}>
                                Try Another URL
                            </Button>
                            <Button onClick={handleSaveToAccount} className="gap-2 flex-1">
                                <Import className="h-4 w-4" />
                                Add {preview.products.length} Products to Catalog
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="py-12">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-muted-foreground">{getStatusMessage()}</p>
                            <Progress value={progress} className="h-2 w-full max-w-xs" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Alternative Options */}
            {(status === 'idle' || status === 'error') && (
                <div className="mt-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">Other ways to add products:</p>
                    <div className="flex justify-center gap-3">
                        <Link href="/dashboard/products/import">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Import className="h-4 w-4" />
                                Import from CannMenus
                            </Button>
                        </Link>
                        <Link href="/dashboard/products/new">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Package className="h-4 w-4" />
                                Add Manually
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
