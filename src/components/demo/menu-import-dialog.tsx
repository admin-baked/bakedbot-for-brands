'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
} from 'lucide-react';
import type { MenuExtraction, ExtractedProduct } from '@/app/api/demo/import-menu/route';

interface MenuImportDialogProps {
  onImportComplete: (data: MenuExtraction) => void;
  trigger?: React.ReactNode;
}

type ImportStatus = 'idle' | 'validating' | 'extracting' | 'processing' | 'complete' | 'error';

export function MenuImportDialog({ onImportComplete, trigger }: MenuImportDialogProps) {
  const [open, setOpen] = useState(false);
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

  const handleConfirm = () => {
    if (preview) {
      onImportComplete(preview);
      setOpen(false);
      resetState();
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Your Menu
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Import Your Dispensary Menu
          </DialogTitle>
          <DialogDescription>
            Enter your website URL and we&apos;ll extract your menu to show you how it looks in BakedBot.
          </DialogDescription>
        </DialogHeader>

        {status === 'idle' || status === 'error' ? (
          <div className="space-y-4 py-4">
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
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleImport()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Works with Dutchie, Jane, Weedmaps, iHeartJane, and most dispensary websites
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">What we&apos;ll extract:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
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
          </div>
        ) : status === 'complete' && preview ? (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully extracted {preview.products.length} products from {preview.dispensary.name || 'your menu'}!
              </AlertDescription>
            </Alert>

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
                  <h3 className="font-semibold">{preview.dispensary.name || 'Your Dispensary'}</h3>
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
          </div>
        ) : (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <DialogFooter>
          {status === 'idle' || status === 'error' ? (
            <Button onClick={handleImport} disabled={!url.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              Import Menu
            </Button>
          ) : status === 'complete' ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={resetState}>
                Try Another URL
              </Button>
              <Button onClick={handleConfirm}>
                Preview in BakedBot
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
