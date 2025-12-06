'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Bug, Search, Filter, Clock, User, AlertTriangle,
    CheckCircle2, XCircle, Download, Copy, ExternalLink,
    MessageSquare, Image, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock tickets data
const MOCK_TICKETS = [
    {
        id: 'TKT-001',
        title: 'Dashboard fails to load analytics data',
        description: 'The analytics dashboard shows infinite loading spinner. API timeout suspected.',
        reporterEmail: 'admin@greenvalley.com',
        orgName: 'Green Valley Dispensary',
        userRole: 'dispensary',
        status: 'new',
        priority: 'high',
        category: 'bug',
        screenshotUrl: '/api/placeholder/800/600',
        pageUrl: '/dashboard/analytics',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        aiSuggestion: {
            possibleCauses: ['API endpoint returning 500 error', 'Auth token expired'],
            suggestedFixes: ['Check API logs', 'Clear user session cache']
        }
    },
    {
        id: 'TKT-002',
        title: 'Cannot connect Shopify integration',
        description: 'OAuth flow fails with redirect error.',
        reporterEmail: 'team@kushbrands.com',
        orgName: 'Kush Brands Co',
        userRole: 'brand',
        status: 'in_progress',
        priority: 'medium',
        category: 'integration_issue',
        screenshotUrl: '/api/placeholder/800/600',
        pageUrl: '/dashboard/settings',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        assignedTo: 'Dev Team',
        aiSuggestion: {
            possibleCauses: ['Shopify callback URL mismatch', 'Missing scope permissions'],
            suggestedFixes: ['Verify callback URL in Shopify app settings', 'Update OAuth scopes']
        }
    },
    {
        id: 'TKT-003',
        title: 'Email campaign not sending',
        description: 'Created campaign but it shows stuck in "Sending" status.',
        reporterEmail: 'marketing@pacificcanna.com',
        orgName: 'Pacific Cannabis',
        userRole: 'dispensary',
        status: 'resolved',
        priority: 'high',
        category: 'bug',
        screenshotUrl: '/api/placeholder/800/600',
        pageUrl: '/dashboard/campaigns',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        resolution: 'Email queue was backed up due to rate limiting. Cleared queue and increased throughput.'
    },
];

type TicketStatus = 'new' | 'triaging' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

const STATUS_COLORS: Record<TicketStatus, string> = {
    new: 'bg-blue-100 text-blue-800',
    triaging: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting_on_user: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
};

export default function TicketsTab() {
    const { toast } = useToast();
    const [selectedTicket, setSelectedTicket] = useState<typeof MOCK_TICKETS[0] | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTickets = MOCK_TICKETS.filter(ticket => {
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesSearch = ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.orgName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleCopyDetails = (ticket: typeof MOCK_TICKETS[0]) => {
        const text = `
Ticket: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description}
Reporter: ${ticket.reporterEmail} (${ticket.orgName})
Page: ${ticket.pageUrl}
Priority: ${ticket.priority}
Category: ${ticket.category}

AI Suggested Causes:
${ticket.aiSuggestion?.possibleCauses.map(c => `- ${c}`).join('\n') || 'N/A'}

AI Suggested Fixes:
${ticket.aiSuggestion?.suggestedFixes.map(f => `- ${f}`).join('\n') || 'N/A'}
        `.trim();

        navigator.clipboard.writeText(text);
        toast({ title: 'Ticket details copied to clipboard' });
    };

    const formatTimeAgo = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return `${Math.floor(diff / (1000 * 60))} min ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Bug className="h-6 w-6 text-primary" />
                        Support Tickets
                    </h2>
                    <p className="text-muted-foreground">User-reported issues with AI-analyzed screenshots</p>
                </div>
                <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">New</p>
                                <p className="text-2xl font-bold">3</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                                <p className="text-2xl font-bold">5</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Resolved Today</p>
                                <p className="text-2xl font-bold">8</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Resolution</p>
                                <p className="text-2xl font-bold">4.2h</p>
                            </div>
                            <Clock className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tickets List */}
            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => setSelectedTicket(ticket)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                                            <Badge className={STATUS_COLORS[ticket.status as TicketStatus]}>
                                                {ticket.status.replace('_', ' ')}
                                            </Badge>
                                            <Badge className={PRIORITY_COLORS[ticket.priority as TicketPriority]}>
                                                {ticket.priority}
                                            </Badge>
                                        </div>
                                        <h3 className="font-medium truncate">{ticket.title}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {ticket.orgName}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatTimeAgo(ticket.createdAt)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Image className="h-3 w-3" />
                                                Screenshot
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={(e) => { e.stopPropagation(); handleCopyDetails(ticket); }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Ticket Detail Dialog */}
            <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedTicket && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-muted-foreground">{selectedTicket.id}</span>
                                    <Badge className={STATUS_COLORS[selectedTicket.status as TicketStatus]}>
                                        {selectedTicket.status.replace('_', ' ')}
                                    </Badge>
                                    <Badge className={PRIORITY_COLORS[selectedTicket.priority as TicketPriority]}>
                                        {selectedTicket.priority}
                                    </Badge>
                                </div>
                                <DialogTitle>{selectedTicket.title}</DialogTitle>
                                <DialogDescription>
                                    Reported by {selectedTicket.reporterEmail} ({selectedTicket.orgName})
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Screenshot */}
                                <div>
                                    <h4 className="font-medium mb-2">Screenshot</h4>
                                    <div className="relative rounded-lg border overflow-hidden bg-slate-100">
                                        <img
                                            src={selectedTicket.screenshotUrl}
                                            alt="Error screenshot"
                                            className="w-full"
                                        />
                                        <Button
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            variant="secondary"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="font-medium mb-2">Description</h4>
                                    <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
                                </div>

                                {/* AI Analysis */}
                                {selectedTicket.aiSuggestion && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-800 mb-2">AI Analysis</h4>
                                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="font-medium text-blue-700">Possible Causes:</p>
                                                <ul className="list-disc ml-4 text-blue-600">
                                                    {selectedTicket.aiSuggestion.possibleCauses.map((cause, i) => (
                                                        <li key={i}>{cause}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="font-medium text-blue-700">Suggested Fixes:</p>
                                                <ul className="list-disc ml-4 text-blue-600">
                                                    {selectedTicket.aiSuggestion.suggestedFixes.map((fix, i) => (
                                                        <li key={i}>{fix}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Page Info */}
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-muted-foreground">Page:</span>
                                    <code className="bg-muted px-2 py-1 rounded">{selectedTicket.pageUrl}</code>
                                    <Button size="sm" variant="ghost" className="gap-1">
                                        <ExternalLink className="h-3 w-3" />
                                        Open Page
                                    </Button>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => handleCopyDetails(selectedTicket)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Details
                                </Button>
                                <Button>
                                    Mark as Resolved
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
