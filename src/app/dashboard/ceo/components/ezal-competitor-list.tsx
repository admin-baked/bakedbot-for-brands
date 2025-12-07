'use client';

import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw, Trash2, ExternalLink, Search } from 'lucide-react';
import { Competitor } from '@/types/ezal-scraper';
import { useToast } from "@/hooks/use-toast";
import { getEzalCompetitors, createEzalCompetitor } from '../actions';

export interface EzalCompetitorListProps {
    tenantId: string;
}

export function EzalCompetitorList({ tenantId }: EzalCompetitorListProps) {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');

    // New competitor form state
    const [newCompetitor, setNewCompetitor] = useState({
        name: '',
        menuUrl: '',
        city: '',
        state: '',
        zip: '',
        type: 'dispensary',
    });

    const fetchCompetitors = async () => {
        setIsLoading(true);
        try {
            // Server Action call
            const data = await getEzalCompetitors(tenantId);
            setCompetitors(data);
        } catch (error) {
            toast({
                title: "Error",
                description: 'Failed to fetch competitors',
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompetitors();
    }, [tenantId]);

    const handleAddCompetitor = async () => {
        if (!newCompetitor.name || !newCompetitor.menuUrl) {
            toast({
                title: "Validation Error",
                description: 'Name and Menu URL are required',
                variant: "destructive",
            });
            return;
        }

        try {
            // Server Action call
            const result = await createEzalCompetitor(tenantId, newCompetitor);

            if (!result.error) {
                toast({
                    title: "Success",
                    description: 'Competitor added successfully',
                });
                setIsAdding(false);
                setNewCompetitor({ name: '', menuUrl: '', city: '', state: '', zip: '', type: 'dispensary' });
                fetchCompetitors();
            } else {
                toast({
                    title: "Error",
                    description: result.message || 'Failed to add competitor',
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: 'Failed to add competitor',
                variant: "destructive",
            });
        }
    };

    const filteredCompetitors = competitors.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.state.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tracked Competitors</CardTitle>
                    <CardDescription>Manage competitive menu sources</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchCompetitors} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-4 w-4" /> Add Competitor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Competitor</DialogTitle>
                                <DialogDescription>
                                    Enter details to start tracking a competitor's menu.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        value={newCompetitor.name}
                                        onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="url" className="text-right">Menu URL</Label>
                                    <Input
                                        id="url"
                                        value={newCompetitor.menuUrl}
                                        onChange={(e) => setNewCompetitor({ ...newCompetitor, menuUrl: e.target.value })}
                                        className="col-span-3"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="city" className="text-right">City</Label>
                                    <Input
                                        id="city"
                                        value={newCompetitor.city}
                                        onChange={(e) => setNewCompetitor({ ...newCompetitor, city: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="state" className="text-right">State</Label>
                                    <Input
                                        id="state"
                                        value={newCompetitor.state}
                                        onChange={(e) => setNewCompetitor({ ...newCompetitor, state: e.target.value })}
                                        className="col-span-3"
                                        maxLength={2}
                                        placeholder="CO"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleAddCompetitor}>Create & Track</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search competitors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                </div>

                {isLoading && competitors.length === 0 ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCompetitors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No competitors found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCompetitors.map((comp) => (
                                    <TableRow key={comp.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{comp.name}</span>
                                                <a
                                                    href={comp.primaryDomain}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center text-xs text-muted-foreground hover:underline"
                                                >
                                                    {new URL(comp.primaryDomain).hostname} <ExternalLink className="ml-1 h-3 w-3" />
                                                </a>
                                            </div>
                                        </TableCell>
                                        <TableCell>{comp.city}, {comp.state}</TableCell>
                                        <TableCell>
                                            <Badge variant={comp.active ? 'default' : 'secondary'}>
                                                {comp.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="capitalize">{comp.type}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
