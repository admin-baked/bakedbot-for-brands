import { Suspense } from 'react';
import { getInventoryData } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, AlertCircle, DollarSign } from 'lucide-react';
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    let user;
    try {
        user = await requireUser(['brand', 'super_user']);
    } catch {
        redirect('/brand-login');
    }

    const brandId = user.brandId;
    if (!brandId) return <div>Brand ID missing</div>;

    const { inventory, stats } = await getInventoryData(brandId);
    // Sort: Out of stock first, then Low stock
    inventory.sort((a, b) => {
        const statusOrder = { 'Out of Stock': 0, 'Low Stock': 1, 'In Stock': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
                    <p className="text-muted-foreground">Track stock levels and inventory value across locations.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Based on Cost (or Price)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-yellow-600">Low Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">Items with &lt; 20 units</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-destructive">Out of Stock</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats.outOfStockCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Holdings</CardTitle>
                    <CardDescription>Real-time stock levels.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            item.status === 'In Stock' ? 'outline' :
                                                item.status === 'Low Stock' ? 'secondary' : 'destructive'
                                        }>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{item.stock}</TableCell>
                                    <TableCell className="text-right">
                                        ${(item.cost || item.price || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        ${item.value.toFixed(2)}
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
