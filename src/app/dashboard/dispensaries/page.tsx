'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getBrandDispensaries, searchDispensaries, addDispensary } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, MapPin, Store } from 'lucide-react';

export default function DispensariesPage() {
    const [dispensaries, setDispensaries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadDispensaries();
    }, []);

    const loadDispensaries = async () => {
        try {
            const data = await getBrandDispensaries();
            setDispensaries(data as any[]);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load dispensaries.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;

        setIsSearching(true);
        try {
            // Assuming query is zip for now based on actions implementation
            const results = await searchDispensaries(searchQuery, '');
            setSearchResults(results);
            if (results.length === 0) {
                toast({ title: 'No results', description: 'Try searching by ZIP code.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Search failed', description: 'Could not find dispensaries.' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleAdd = async (dispensary: any) => {
        try {
            await addDispensary(dispensary);
            toast({ title: 'Success', description: 'Dispensary added to your partners.' });
            setIsSearchOpen(false);
            loadDispensaries();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add dispensary.' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dispensary Partners</h1>
                    <p className="text-muted-foreground">Manage the dispensaries that carry your products.</p>
                </div>
                <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add Dispensary
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Add Dispensary Partner</DialogTitle>
                        </DialogHeader>
                        <Tabs defaultValue="search" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="search">Search by ZIP</TabsTrigger>
                                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                            </TabsList>
                            <TabsContent value="search" className="space-y-4 py-4">
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <div className="grid w-full items-center gap-1.5">
                                        <Label htmlFor="search">ZIP Code</Label>
                                        <Input
                                            id="search"
                                            placeholder="e.g. 90210"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <Button type="submit" className="mt-auto" disabled={isSearching}>
                                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                                    </Button>
                                </form>

                                {searchResults.length > 0 && (
                                    <div className="border rounded-md max-h-[300px] overflow-y-auto">
                                        {searchResults.map((result) => (
                                            <div key={result.id} className="flex items-center justify-between p-3 border-b last:border-0">
                                                <div>
                                                    <div className="font-medium">{result.name}</div>
                                                    <div className="text-sm text-muted-foreground">{result.address}, {result.city}</div>
                                                </div>
                                                <Button size="sm" variant="secondary" onClick={() => handleAdd(result)}>Add</Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>
                            <TabsContent value="manual" className="space-y-4 py-4">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const newDispensary = {
                                        name: formData.get('name'),
                                        address: formData.get('address'),
                                        city: formData.get('city'),
                                        state: formData.get('state'),
                                        zip: formData.get('zip'),
                                        // Generate a random ID if not provided by backend logic, 
                                        // but strict typing might require it. 
                                        // Let's rely on actions.ts handling missing ID or generate one here.
                                        // actions.ts handles missing ID by using .add() if ID is missing.
                                    };
                                    handleAdd(newDispensary);
                                }} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Dispensary Name</Label>
                                        <Input id="name" name="name" required placeholder="e.g. Green Valley Collective" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input id="address" name="address" required placeholder="123 Main St" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="city">City</Label>
                                            <Input id="city" name="city" required placeholder="Los Angeles" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="state">State</Label>
                                            <Input id="state" name="state" required placeholder="CA" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="zip">ZIP Code</Label>
                                        <Input id="zip" name="zip" required placeholder="90001" />
                                    </div>
                                    <Button type="submit" className="w-full">Add Dispensary</Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : dispensaries.length === 0 ? (
                <Card className="text-center p-8">
                    <div className="flex flex-col items-center gap-2">
                        <Store className="h-12 w-12 text-muted-foreground/50" />
                        <h3 className="text-lg font-semibold">No dispensaries yet</h3>
                        <p className="text-muted-foreground">Add dispensaries to track where your products are sold.</p>
                        <Button variant="outline" onClick={() => setIsSearchOpen(true)} className="mt-4">
                            Add Your First Dispensary
                        </Button>
                    </div>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dispensaries.map((dispensary) => (
                                <TableRow key={dispensary.id}>
                                    <TableCell className="font-medium">{dispensary.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            {dispensary.city}, {dispensary.state}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={dispensary.source === 'automated' ? 'secondary' : 'default'} className="capitalize">
                                            {dispensary.source || 'Manual'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">View</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
