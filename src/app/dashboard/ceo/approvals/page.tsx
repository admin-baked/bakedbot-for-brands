
'use client';

import { useState, useEffect } from 'react';
import { getPendingApprovals, approveRequest } from '@/server/actions/approvals';
import { ApprovalRequest } from '@/types/agent-toolkit';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Check, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ApprovalsPage({ params }: { params: { tenantId?: string } }) {
    // Hardcoded tenant for now or context
    const tenantId = 'demo-tenant';

    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await getPendingApprovals(tenantId);
            setRequests(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDecision(id: string, approved: boolean) {
        try {
            await approveRequest(tenantId, id, approved);
            toast({
                title: approved ? 'Approved' : 'Rejected',
                description: `Request ${approved ? 'approved' : 'rejected'} successfully.`
            });
            load();
        } catch (err) {
            toast({
                title: 'Error',
                description: 'Failed to update request.',
                variant: 'destructive'
            });
        }
    }

    if (loading) return <div className="p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold">Pending Approvals</h1>

            {requests.length === 0 && (
                <div className="text-muted-foreground">No pending approvals.</div>
            )}

            <div className="grid gap-4">
                {requests.map(req => (
                    <Card key={req.id}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">{req.description}</CardTitle>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleDecision(req.id, false)}>
                                    <X className="w-4 h-4 mr-1" /> Reject
                                </Button>
                                <Button size="sm" onClick={() => handleDecision(req.id, true)}>
                                    <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                Requested by: {req.requestedBy.userId} ({req.requestedBy.role})
                            </div>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(req, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
