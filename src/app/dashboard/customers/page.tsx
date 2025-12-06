import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getCustomers, type CustomerSegment } from './actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail, Phone, Users, UserCheck, UserX, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

function SegmentBadge({ segment }: { segment: CustomerSegment }) {
    switch (segment) {
        case 'VIP':
            return <Badge className="bg-purple-500 hover:bg-purple-600">VIP</Badge>;
        case 'Loyal':
            return <Badge className="bg-blue-500 hover:bg-blue-600">Loyal</Badge>;
        case 'New':
            return <Badge className="bg-green-500 hover:bg-green-600">New</Badge>;
        case 'Slipping':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Slipping</Badge>;
        case 'Risk':
            return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">At Risk</Badge>;
        case 'Churned':
            return <Badge variant="destructive">Churned</Badge>;
        default:
            return <Badge variant="outline">{segment}</Badge>;
    }
}

export default async function CustomersPage() {
    let user;
    try {
        user = await requireUser(['brand', 'owner']);
    } catch (error) {
        redirect('/brand-login');
    }

    const { customers, stats } = await getCustomers(user.brandId!);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers (Mrs. Parker)</h1>
                    <p className="text-muted-foreground">Loyalty segments and customer history.</p>
                </div>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                        <p className="text-xs text-muted-foreground">Unique emails in order history</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">VIP Members</CardTitle>
                        <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.vipCount}</div>
                        <p className="text-xs text-muted-foreground">High value or frequent shoppers</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">At Risk / Churned</CardTitle>
                        <UserX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.churnRiskCount}</div>
                        <p className="text-xs text-muted-foreground">Need win-back campaigns</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customer List</CardTitle>
                    <CardDescription>
                        Segmented by purchase behavior.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Segments</TableHead>
                                <TableHead>Visits</TableHead>
                                <TableHead>Last Visit</TableHead>
                                <TableHead className="text-right">Total Spent</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name || 'Unknown'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {customer.email}</span>
                                            {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {customer.phone}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <SegmentBadge segment={customer.segment} />
                                    </TableCell>
                                    <TableCell>{customer.visits}</TableCell>
                                    <TableCell>{new Date(customer.lastVisit).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right font-bold">${customer.totalSpent.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                            {customers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No customer data found.
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
