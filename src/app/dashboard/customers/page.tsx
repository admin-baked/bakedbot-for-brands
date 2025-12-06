'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Mail, Phone } from 'lucide-react';

const MOCK_CUSTOMERS = [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', phone: '(555) 123-4567', visits: 12, lastVisit: '2025-05-15', totalSpent: 450.00 },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', phone: '(555) 987-6543', visits: 5, lastVisit: '2025-05-10', totalSpent: 120.50 },
    { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', phone: '(555) 555-5555', visits: 1, lastVisit: '2025-05-01', totalSpent: 45.00 },
    { id: '4', name: 'Diana Prince', email: 'diana@example.com', phone: '(555) 222-3333', visits: 24, lastVisit: '2025-05-18', totalSpent: 1200.00 },
    { id: '5', name: 'Evan Wright', email: 'evan@example.com', phone: '(555) 444-8888', visits: 3, lastVisit: '2025-04-20', totalSpent: 85.00 },
];

export default function CustomersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                    <p className="text-muted-foreground">Manage your customer relationships and history.</p>
                </div>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Customers</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search customers..." className="pl-8" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Visits</TableHead>
                                <TableHead>Last Visit</TableHead>
                                <TableHead className="text-right">Total Spent</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_CUSTOMERS.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {customer.email}</span>
                                            <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {customer.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.visits}</TableCell>
                                    <TableCell>{customer.lastVisit}</TableCell>
                                    <TableCell className="text-right">${customer.totalSpent.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
