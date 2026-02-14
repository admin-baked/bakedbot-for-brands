'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCcw, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWhatsAppHistoryAction } from '@/server/actions/whatsapp';

export function MessageHistoryCard() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [filterPhone, setFilterPhone] = useState('');

    const loadHistory = async () => {
        setLoading(true);
        try {
            const response = await getWhatsAppHistoryAction({
                phoneNumber: filterPhone || undefined,
                limit: 50,
            });

            if (response.success && response.data) {
                const data = response.data as any;
                if (data.messages) {
                    setMessages(data.messages);
                }
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to load history",
                    description: response.error || 'Unknown error',
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadHistory();
    }, []);

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
            return `${Math.floor(diffMins / 1440)}d ago`;
        } catch {
            return timestamp;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Message History</CardTitle>
                <CardDescription>View sent and received WhatsApp messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Label htmlFor="filter-phone" className="sr-only">Filter by phone</Label>
                        <Input
                            id="filter-phone"
                            placeholder="Filter by phone number..."
                            value={filterPhone}
                            onChange={(e) => setFilterPhone(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={loadHistory} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <><Search className="h-4 w-4 mr-2" /> Search</>
                        )}
                    </Button>
                    <Button variant="ghost" onClick={loadHistory} disabled={loading}>
                        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {messages.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No messages found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                messages.map((msg) => (
                                    <TableRow key={msg.id}>
                                        <TableCell className="font-mono text-xs">{msg.from}</TableCell>
                                        <TableCell className="font-mono text-xs">{msg.to}</TableCell>
                                        <TableCell className="max-w-[300px] truncate">{msg.message}</TableCell>
                                        <TableCell>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                msg.status === 'sent' ? 'bg-green-100 text-green-700' :
                                                msg.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {msg.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {formatTimestamp(msg.timestamp)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
