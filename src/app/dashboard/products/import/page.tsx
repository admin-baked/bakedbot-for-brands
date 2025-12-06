'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { searchCannMenusProducts, importProducts } from '../actions';
import { Loader2, Search, Import } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ImportProductsPage() {
    const [brandName, setBrandName] = useState('');
    const [state, setState] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const router = useRouter();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brandName || !state) {
            toast({ variant: 'destructive', title: 'Missing fields', description: 'Please enter both brand name and state.' });
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchCannMenusProducts(brandName, state);
            setProducts(results);
            if (results.length === 0) {
                toast({ title: 'No products found', description: 'Try different search terms.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Search failed', description: 'Could not fetch products.' });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleProduct = (id: string) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedProducts(newSelected);
    };

    const toggleAll = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(products.map(p => p.id)));
        }
    };

    const handleImport = async () => {
        if (selectedProducts.size === 0) return;

        setIsLoading(true);
        try {
            const productsToImport = products.filter(p => selectedProducts.has(p.id));
            const result = await importProducts(productsToImport);
            toast({ title: 'Success', description: `Imported ${result.count} products.` });
            router.push('/dashboard/products');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Import failed', description: 'Could not save products.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Import Products</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Search CannMenus</CardTitle>
                    <CardDescription>Find your products in the CannMenus database to import them.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="brand">Brand Name</Label>
                            <Input
                                id="brand"
                                placeholder="e.g. Jeeter"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                            />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="state">State</Label>
                            <Input
                                id="state"
                                placeholder="e.g. CA"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {products.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Results ({products.length})</CardTitle>
                        <Button onClick={handleImport} disabled={isLoading || selectedProducts.size === 0}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Import className="mr-2 h-4 w-4" />}
                            Import Selected ({selectedProducts.size})
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedProducts.size === products.length && products.length > 0}
                                            onCheckedChange={toggleAll}
                                        />
                                    </TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedProducts.has(product.id)}
                                                onCheckedChange={() => toggleProduct(product.id)}
                                            />
                                        </TableCell>
                                        <TableCell>{product.name}</TableCell>
                                        <TableCell>{product.category}</TableCell>
                                        <TableCell>${product.price}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
