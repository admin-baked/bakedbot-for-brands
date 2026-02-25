'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Globe, Trash2, RefreshCw, Store, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ingestVendorBrand, deleteVendorBrand } from '@/server/actions/vendor-brands';
import type { VendorBrand } from '@/types/vendor-brands';
import Image from 'next/image';

// ─── Brand Card ───────────────────────────────────────────────────────────────

function VendorBrandCard({
  brand,
  onDelete,
  onRefresh,
}: {
  brand: VendorBrand;
  onDelete: (id: string) => void;
  onRefresh: (website: string, id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteVendorBrand(brand.id);
    if (result.success) {
      onDelete(brand.id);
    } else {
      toast({ title: 'Delete failed', description: result.error, variant: 'destructive' });
      setDeleting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh(brand.website, brand.id);
    setRefreshing(false);
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Color accent strip */}
      {brand.primaryColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: brand.primaryColor }}
        />
      )}
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="w-12 h-12 flex-shrink-0 rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
            {brand.logoUrl ? (
              <Image
                src={brand.logoUrl}
                alt={brand.name}
                width={48}
                height={48}
                className="object-contain"
                unoptimized
              />
            ) : (
              <Store className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold leading-tight">{brand.name}</h3>
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5"
                >
                  <Globe className="h-3 w-3" />
                  {brand.website.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Re-scan website"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {brand.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Smokey will no longer have context about this brand. Your product catalog is unaffected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Description */}
            {brand.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{brand.description}</p>
            )}

            {/* Tags row */}
            <div className="mt-2 flex flex-wrap gap-1">
              {brand.voiceKeywords?.slice(0, 3).map(kw => (
                <Badge key={kw} variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
                  {kw}
                </Badge>
              ))}
              {brand.categories?.slice(0, 2).map(cat => (
                <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto">
                  {cat}
                </Badge>
              ))}
            </div>

            {/* Product lines */}
            {brand.productLines && brand.productLines.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Lines: {brand.productLines.slice(0, 4).join(', ')}
              </p>
            )}

            {/* Confidence */}
            {brand.extractionConfidence != null && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                {brand.extractionConfidence >= 60 ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-amber-500" />
                )}
                {brand.extractionConfidence}% scan confidence
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add Brand Sheet ──────────────────────────────────────────────────────────

function AddBrandSheet({ onIngested }: { onIngested: (brand: VendorBrand) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleIngest = () => {
    if (!url.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await ingestVendorBrand(url.trim());
      if (result.success && result.brand) {
        onIngested(result.brand);
        toast({
          title: `${result.brand.name} added`,
          description: 'Smokey can now speak knowledgeably about this brand.',
        });
        setUrl('');
        setOpen(false);
      } else {
        setError(result.error ?? 'Failed to scan the website. Try another URL.');
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add a Brand You Carry</SheetTitle>
          <SheetDescription>
            Enter the brand&rsquo;s website. BakedBot will scan it and extract their voice,
            product lines, and brand story — so Smokey can represent them accurately
            when customers ask.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Website</label>
            <Input
              placeholder="e.g. kivaconfections.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleIngest()}
              disabled={pending}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium">What gets extracted:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Brand name, tagline, and description</li>
              <li>• Voice personality (sophisticated, playful, wellness-focused…)</li>
              <li>• Product lines and cannabis categories</li>
              <li>• Brand colors and logo</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-amber-50 border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              <strong>Tip:</strong> For best results, use the brand&rsquo;s main marketing
              site rather than a retail listing (e.g. <em>kivaconfections.com</em> not
              <em> leafly.com/brands/kiva</em>).
            </p>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button
            onClick={handleIngest}
            disabled={!url.trim() || pending}
            className="w-full gap-2"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning website…
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Scan & Add Brand
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function VendorBrandsClient({ initialBrands }: { initialBrands: VendorBrand[] }) {
  const [brands, setBrands] = useState<VendorBrand[]>(initialBrands);
  const { toast } = useToast();

  const handleIngested = (brand: VendorBrand) => {
    setBrands(prev => {
      const idx = prev.findIndex(b => b.id === brand.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = brand;
        return next;
      }
      return [brand, ...prev].sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const handleDelete = (id: string) => {
    setBrands(prev => prev.filter(b => b.id !== id));
  };

  const handleRefresh = async (website: string, id: string) => {
    const result = await ingestVendorBrand(website);
    if (result.success && result.brand) {
      handleIngested({ ...result.brand, id });
      toast({ title: 'Brand refreshed', description: 'Smokey has the latest info.' });
    } else {
      toast({ title: 'Refresh failed', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brands We Carry</h1>
          <p className="text-muted-foreground mt-1">
            Teach Smokey about the brands on your shelves. She&rsquo;ll represent each one
            accurately when customers ask.
            {brands.length > 0 && (
              <span className="ml-2 text-foreground font-medium">{brands.length} brand{brands.length !== 1 ? 's' : ''} ingested.</span>
            )}
          </p>
        </div>
        <AddBrandSheet onIngested={handleIngested} />
      </div>

      {/* How it works */}
      {brands.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No brands added yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add the cannabis brands you carry — Kiva, STIIIZY, Wyld, Alien Labs, Jeeter —
              and Smokey will instantly know how to talk about them at the counter.
            </p>
            <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground mb-6 w-full max-w-sm">
              <div className="rounded-lg border p-2 text-center">
                <div className="font-semibold text-foreground">1.</div>
                Paste brand website
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="font-semibold text-foreground">2.</div>
                BakedBot scans it
              </div>
              <div className="rounded-lg border p-2 text-center">
                <div className="font-semibold text-foreground">3.</div>
                Smokey learns it
              </div>
            </div>
            <AddBrandSheet onIngested={handleIngested} />
          </CardContent>
        </Card>
      )}

      {/* Brand grid */}
      {brands.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brands.map(brand => (
            <VendorBrandCard
              key={brand.id}
              brand={brand}
              onDelete={handleDelete}
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {/* Smokey integration note */}
      {brands.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🤖</div>
              <div className="text-sm">
                <p className="font-medium text-emerald-900 dark:text-emerald-100">
                  Smokey knows {brands.length} brand{brands.length !== 1 ? 's' : ''}
                </p>
                <p className="text-emerald-700 dark:text-emerald-300 mt-0.5">
                  When customers ask &ldquo;tell me about {brands[0]?.name}&rdquo; or
                  &ldquo;what&rsquo;s the vibe of {brands[0]?.name}?&rdquo; — Smokey will
                  answer with their actual brand voice and product lines.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
