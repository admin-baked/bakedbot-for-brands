import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getFinancialData } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FinancialsPage() {
    let user;
    try {
        user = await requireUser(['brand', 'super_user']);
    } catch (error) {
        redirect('/brand-login');
    }

    const data = await getFinancialData(user.brandId!);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Financial Intelligence</h1>
                <p className="text-muted-foreground">
                    Analyze your margins and profitability with Money Mike.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Gross sales volume</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cost of Goods (COGS)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Total product costs</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Revenue - Cost</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Margin</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(data.grossMargin * 100).toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Profitability percentage</p>
                    </CardContent>
                </Card>
            </div>

            {/* Product Margins Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Product Profitability</CardTitle>
                    <CardDescription>
                        Top performing products by Gross Profit contribution.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Units Sold</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">COGS</TableHead>
                                <TableHead className="text-right">Profit</TableHead>
                                <TableHead className="text-right">Margin %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.products.map((product) => (
                                <TableRow key={product.productId}>
                                    <TableCell className="font-medium">{product.productName}</TableCell>
                                    <TableCell className="text-right">{product.unitsSold}</TableCell>
                                    <TableCell className="text-right">${product.totalRevenue.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">${product.totalCost.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-bold">${product.grossProfit.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={product.grossMargin < 0.3 ? "text-red-500" : product.grossMargin > 0.6 ? "text-green-500" : ""}>
                                            {(product.grossMargin * 100).toFixed(1)}%
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.products.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No sales data available.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
