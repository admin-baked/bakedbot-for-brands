'use client';

import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Store, AlertTriangle } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { searchCannMenusProducts, ImportCandidate, linkBrandProducts } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function BrandProductSearch({ 
  initialBrandName = '',
  onSuccess 
}: { 
  initialBrandName?: string;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState(initialBrandName);
  const [results, setResults] = useState<ImportCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  
  const { toast } = useToast();

  const handleSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await searchCannMenusProducts(searchTerm);
      setResults(data);
      // Auto-select all by default if reasonable count
      if (data.length > 0 && data.length <= 50) {
        setSelectedIds(new Set(data.map(p => p.id)));
      } else {
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Search failed', error);
      toast({
        title: 'Search Failed',
        description: 'Could not fetch products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Debounced search effect
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    handleSearch(debouncedQuery);
  }, [debouncedQuery, handleSearch]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const selectedProducts = results.filter(p => selectedIds.has(p.id));

  const handleConfirmLink = async () => {
    if (selectedProducts.length === 0) return;
    
    setIsLinking(true);
    try {
        await linkBrandProducts(selectedProducts);
        toast({
            title: 'Products Linked!',
            description: `Successfully linked ${selectedProducts.length} products to your brand.`,
        });
        setIsConfirming(false);
        onSuccess();
    } catch (error) {
        toast({
            title: 'Linking Failed',
            description: error instanceof Error ? error.message : 'Unknown error occurred.',
            variant: 'destructive',
        });
    } finally {
        setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Search for your Products</h2>
        <p className="text-sm text-neutral-500">
          Type your brand to find products carried by retailers. We'll import product details and availability.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          <Input 
            placeholder="Search brand (e.g. Jeeter, Stiiizy)..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-11"
          />
          {isLoading && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-600">
                Found {results.length} products
            </h3>
            <div className="flex items-center gap-3">
                <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={toggleSelectAll}
                >
                    {selectedIds.size === results.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button 
                    disabled={selectedIds.size === 0}
                    onClick={() => setIsConfirming(true)}
                >
                    Import {selectedIds.size} Products
                </Button>
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto border rounded-xl bg-neutral-50/50 p-2 space-y-2">
            {results.map((product) => (
                <Card 
                    key={product.id} 
                    className={`
                        transition-colors cursor-pointer border-transparent shadow-sm hover:shadow-md
                        ${selectedIds.has(product.id) ? 'ring-2 ring-emerald-500 bg-white' : 'bg-white/80 hover:bg-white'}
                    `}
                    onClick={() => toggleSelection(product.id)}
                >
                    <CardContent className="p-4 flex items-start gap-4">
                        <Checkbox 
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelection(product.id)}
                            className="mt-1"
                        />
                        
                        <div className="h-16 w-16 bg-neutral-100 rounded-lg flex-shrink-0 bg-cover bg-center" 
                             style={{ backgroundImage: `url(${product.image || '/placeholder.png'})` }} 
                        />
                        
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-neutral-900 truncate" title={product.name}>
                                {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                    {product.category}
                                </Badge>
                                {product.price > 0 && (
                                    <span className="text-sm font-mono text-neutral-600">
                                        ${product.price.toFixed(2)}
                                    </span>
                                )}
                            </div>
                            
                            {(product.retailerName || product.retailerState) && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
                                    <Store className="w-3 h-3" />
                                    <span>
                                        Found at <span className="font-medium text-neutral-700">{product.retailerName || 'Unknown Retailer'}</span>
                                        {product.retailerState && ` (${product.retailerState})`}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    One-Time Confirmation
                </DialogTitle>
                <DialogDescription className="pt-2 space-y-3">
                    <p>
                        You are about to link <strong>{selectedProducts.length} products</strong> to your brand.
                    </p>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <strong>Warning:</strong> This action can only be performed <u>once</u>. 
                        Once linked, your Brand Name will be locked and any future product catalog updates requires Admin approval.
                    </div>
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setIsConfirming(false)}>
                    Cancel
                </Button>
                <Button onClick={handleConfirmLink} disabled={isLinking}>
                    {isLinking ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Linking...
                        </>
                    ) : (
                        'Confirm & Lock Catalog'
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
