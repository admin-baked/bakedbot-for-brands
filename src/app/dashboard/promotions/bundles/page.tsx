// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Archive, Edit, MoreHorizontal, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Mock data
const BUNDLES = [
    { id: '1', name: 'Camino 3 for $49.99', type: 'Mix & Match', status: 'Active', sales: 42, revenue: '$2,099.58', expiry: 'Dec 31, 2025' },
    { id: '2', name: 'Jeeter BOGO 50%', type: 'BOGO', status: 'Scheduled', sales: 0, revenue: '$0.00', expiry: 'Jan 15, 2026' },
];

export default function BundlesDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deals & Bundles</h1>
                    <p className="text-muted-foreground">Create and manage your promotional bundles.</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Create Bundle
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Bundles</CardTitle>
                    <CardDescription>Manage your current running promotions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Redemptions</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {BUNDLES.map((bundle) => (
                                <TableRow key={bundle.id}>
                                    <TableCell className="font-medium">{bundle.name}</TableCell>
                                    <TableCell>{bundle.type}</TableCell>
                                    <TableCell>
                                        <Badge variant={bundle.status === 'Active' ? 'default' : 'secondary'}>
                                            {bundle.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{bundle.sales}</TableCell>
                                    <TableCell className="text-right">{bundle.revenue}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Copy className="mr-2 h-4 w-4" /> Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">
                                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
