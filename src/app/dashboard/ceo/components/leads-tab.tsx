'use client';

/**
 * CEO Dashboard - Leads Tab
 * Displays email leads captured from age gates and other lead magnets
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, Download, Filter, Calendar } from 'lucide-react';
import { getLeads, getLeadStats, type EmailLead } from '@/server/actions/email-capture';
import { formatDistanceToNow } from 'date-fns';

export default function LeadsTab() {
    const [leads, setLeads] = useState<EmailLead[]>([]);
    const [stats, setStats] = useState<{
        total: number;
        emailOptIns: number;
        smsOptIns: number;
        ageVerified: number;
        bySource: Record<string, number>;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSource, setSelectedSource] = useState<string>('all');

    useEffect(() => {
        loadLeads();
    }, []);

    async function loadLeads() {
        setIsLoading(true);
        try {
            const [leadsData, statsData] = await Promise.all([
                getLeads(),
                getLeadStats(),
            ]);

            setLeads(leadsData);
            setStats(statsData);
        } catch (error) {
            console.error('[LeadsTab] Failed to load leads:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredLeads = selectedSource === 'all'
        ? leads
        : leads.filter(lead => lead.source === selectedSource);

    const exportToCSV = () => {
        if (filteredLeads.length === 0) return;

        const headers = ['Lead ID', 'Name', 'Email', 'Phone', 'State', 'Source', 'Email Consent', 'SMS Consent', 'Age Verified', 'Captured At'];
        const rows = filteredLeads.map(lead => [
            lead.id,
            lead.firstName || '',
            lead.email || '',
            lead.phone || '',
            lead.state || '',
            lead.source,
            lead.emailConsent ? 'Yes' : 'No',
            lead.smsConsent ? 'Yes' : 'No',
            lead.ageVerified ? 'Yes' : 'No',
            new Date(lead.capturedAt).toISOString(),
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bakedbot-leads-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            All captured leads
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Email Opt-Ins</CardTitle>
                        <Mail className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.emailOptIns || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.total ? Math.round((stats.emailOptIns / stats.total) * 100) : 0}% opt-in rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SMS Opt-Ins</CardTitle>
                        <Phone className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.smsOptIns || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.total ? Math.round((stats.smsOptIns / stats.total) * 100) : 0}% opt-in rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Age Verified</CardTitle>
                        <Calendar className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.ageVerified || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.total ? Math.round((stats.ageVerified / stats.total) * 100) : 0}% verified
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="all">All Sources</option>
                        {stats?.bySource && Object.keys(stats.bySource).map(source => (
                            <option key={source} value={source}>
                                {source} ({stats.bySource[source]})
                            </option>
                        ))}
                    </select>
                </div>

                <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Leads Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Leads</CardTitle>
                    <CardDescription>
                        Showing {filteredLeads.length} of {leads.length} total leads
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 px-3 font-medium">Name</th>
                                    <th className="py-2 px-3 font-medium">Email</th>
                                    <th className="py-2 px-3 font-medium">Phone</th>
                                    <th className="py-2 px-3 font-medium">State</th>
                                    <th className="py-2 px-3 font-medium">Source</th>
                                    <th className="py-2 px-3 font-medium">Consent</th>
                                    <th className="py-2 px-3 font-medium">Captured</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No leads captured yet
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="border-b hover:bg-muted/50">
                                            <td className="py-3 px-3">
                                                {lead.firstName || '-'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1">
                                                    {lead.email || '-'}
                                                    {lead.emailConsent && (
                                                        <Mail className="h-3 w-3 text-green-600" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1">
                                                    {lead.phone || '-'}
                                                    {lead.smsConsent && (
                                                        <Phone className="h-3 w-3 text-blue-600" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                {lead.state || '-'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs">
                                                    {lead.source}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex gap-1">
                                                    {lead.emailConsent && (
                                                        <span className="text-xs text-green-600">Email</span>
                                                    )}
                                                    {lead.smsConsent && (
                                                        <span className="text-xs text-blue-600">SMS</span>
                                                    )}
                                                    {!lead.emailConsent && !lead.smsConsent && '-'}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(lead.capturedAt), { addSuffix: true })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
