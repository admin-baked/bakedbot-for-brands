'use client';

import { useState, useEffect } from 'react';
import { Invitation } from '@/types/invitation';
import { getInvitationsAction, revokeInvitationAction } from '@/server/actions/invitations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InviteUserDialog } from './invite-user-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { UserRole } from '@/types/roles';

interface InvitationsListProps {
    orgId?: string;
    allowedRoles: UserRole[];
}

export function InvitationsList({ orgId, allowedRoles }: InvitationsListProps) {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchInvitations = async () => {
        setIsLoading(true);
        const data = await getInvitationsAction(orgId);
        setInvitations(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchInvitations();
    }, [orgId]);

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this invitation?')) return;
        
        try {
            const res = await revokeInvitationAction(id);
            if (res.success) {
                toast({ title: 'Revoked', description: 'Invitation has been revoked.' });
                fetchInvitations();
            } else {
                toast({ title: 'Error', description: res.message, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to revoke.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Pending Invitations</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchInvitations} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <InviteUserDialog 
                        orgId={orgId} 
                        allowedRoles={allowedRoles} 
                        onInviteSent={fetchInvitations} 
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invitations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No pending invitations.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invitations.map((invite) => (
                                <TableRow key={invite.id}>
                                    <TableCell>{invite.email}</TableCell>
                                    <TableCell className="capitalize">{invite.role.replace('_', ' ')}</TableCell>
                                    <TableCell>{formatDistanceToNow(new Date(invite.createdAt))} ago</TableCell>
                                    <TableCell>
                                        <Badge variant={invite.status === 'pending' ? 'outline' : 'secondary'}>
                                            {invite.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleRevoke(invite.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
