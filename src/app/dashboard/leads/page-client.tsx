'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Download, UserPlus, Mail, Building2, Briefcase,
    Handshake, Package, Loader2, MoreHorizontal, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
    type Lead,
    type LeadType,
    type LeadsData,
    getLeads,
    updateLead,
    deleteLead,
    getLeadTypeInfo
} from './actions';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LeadsDashboardProps {
    initialData?: LeadsData;
    orgId: string;
}

const LEAD_TYPE_ICONS: Record<LeadType, any> = {
    customer_inquiry: Mail,
    brand_request: Building2,
    vendor_inquiry: Briefcase,
    partnership: Handshake,
    wholesale: Package,
};

export default function LeadsDashboard({ initialData, orgId }: LeadsDashboardProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(!initialData);
    const [data, setData] = useState<LeadsData | null>(initialData || null);
    const [activeType, setActiveType] = useState<LeadType | 'all'>('all');
    const [search, setSearch] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getLeads(orgId);
            setData(result);
        } catch (error) {
            console.error('Failed to load leads:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load leads' });
        } finally {
            setLoading(false);
        }
    }, [orgId, toast]);

    useEffect(() => {
        if (!initialData) {
            loadData();
        }
    }, [initialData, loadData]);

    const handleExport = () => {
        if (!data?.leads.length) return;

        const headers = ['Email', 'Name', 'Company', 'Type', 'Source', 'Status', 'Date'];
        const rows = data.leads.map(l => [
            l.email,
            l.name || '',
            l.company || '',
            l.type,
            l.source,
            l.status,
            format(l.createdAt, 'yyyy-MM-dd HH:mm'),
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(e => e.map(v => `"${v}"`).join(','))].join('\n');

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "leads.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStatusChange = async (leadId: string, status: Lead['status']) => {
        try {
            await updateLead(leadId, { status });
            toast({ title: 'Updated', description: 'Lead status updated' });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update lead' });
        }
    };

    const handleDelete = async (leadId: string) => {
        try {
            await deleteLead(leadId);
            toast({ title: 'Deleted', description: 'Lead removed' });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete lead' });
        }
    };

    // Filter leads
    const filteredLeads = data?.leads.filter(l => {
        if (activeType !== 'all' && l.type !== activeType) return false;
        if (search) {
            const searchLower = search.toLowerCase();
            return (
                l.email.toLowerCase().includes(searchLower) ||
                l.name?.toLowerCase().includes(searchLower) ||
                l.company?.toLowerCase().includes(searchLower)
            );
        }
        return true;
    }) || [];

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const stats = data?.stats;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Business Leads</h1>
                    <p className="text-muted-foreground">
                        Manage B2B inquiries, brand requests, and partnership opportunities.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData} disabled={loading}>
                        <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={!data?.leads.length}>
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New</CardTitle>
                        <Mail className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.new || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Brand Requests</CardTitle>
                        <Building2 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.byType?.brand_request || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendor Inquiries</CardTitle>
                        <Briefcase className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.byType?.vendor_inquiry || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Converted</CardTitle>
                        <Handshake className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.converted || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Leads Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                            <CardTitle>Lead Pipeline</CardTitle>
                            <CardDescription>
                                {filteredLeads.length} leads {activeType !== 'all' ? `of type "${activeType}"` : ''}
                            </CardDescription>
                        </div>
                        <Input
                            placeholder="Search leads..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeType} onValueChange={(v) => setActiveType(v as LeadType | 'all')}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="customer_inquiry">Customer</TabsTrigger>
                            <TabsTrigger value="brand_request">Brand Requests</TabsTrigger>
                            <TabsTrigger value="vendor_inquiry">Vendors</TabsTrigger>
                            <TabsTrigger value="partnership">Partnerships</TabsTrigger>
                            <TabsTrigger value="wholesale">Wholesale</TabsTrigger>
                        </TabsList>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLeads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No leads yet. Share your contact forms and landing pages!
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLeads.slice(0, 50).map(lead => {
                                    const typeInfo = getLeadTypeInfo(lead.type);
                                    const TypeIcon = LEAD_TYPE_ICONS[lead.type];

                                    return (
                                        <TableRow key={lead.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{lead.name || lead.email}</div>
                                                    {lead.company && (
                                                        <div className="text-xs text-muted-foreground">{lead.company}</div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground">{lead.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={typeInfo.color}>
                                                    <TypeIcon className="h-3 w-3 mr-1" />
                                                    {typeInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="capitalize">{lead.source}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={lead.status}
                                                    onValueChange={(v) => handleStatusChange(lead.id, v as Lead['status'])}
                                                >
                                                    <SelectTrigger className="w-28 h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="new">New</SelectItem>
                                                        <SelectItem value="contacted">Contacted</SelectItem>
                                                        <SelectItem value="qualified">Qualified</SelectItem>
                                                        <SelectItem value="converted">Converted</SelectItem>
                                                        <SelectItem value="closed">Closed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>{format(lead.createdAt, 'PP')}</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDelete(lead.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
