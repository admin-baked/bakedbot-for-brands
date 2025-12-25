'use client';

/**
 * Team Management Page
 * Invite team members and manage access for all roles
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { InviteUserDialog } from '@/components/invitations/invite-user-dialog';
import { getInvitationsAction, revokeInvitationAction } from '@/server/actions/invitations';
import { Invitation } from '@/types/invitation';
import { UserPlus, Mail, Clock, CheckCircle, XCircle, Loader2, Trash2, Copy } from 'lucide-react';

export default function TeamPage() {
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useUser();
    const userProfile = user as any; // Augmented user from hook

    const orgId = userProfile?.currentOrgId || userProfile?.brandId;
    const userRole = userProfile?.role as 'brand' | 'dispensary' | 'super_admin' | 'customer' | 'owner' | undefined;

    // Determine allowed roles based on current user's role
    const getAllowedRoles = (): ('brand' | 'dispensary' | 'super_admin' | 'customer')[] => {
        if (userRole === 'super_admin') {
            return ['brand', 'dispensary', 'super_admin', 'customer'];
        }
        if (userRole === 'brand' || userRole === 'dispensary' || userRole === 'owner') {
            if (userRole === 'owner') return ['brand']; // Owner invites brand members
            return [userRole]; // Can only invite same role (team members)
        }
        return [];
    };

    const loadInvitations = async () => {
        if (!orgId && userRole !== 'super_admin') return;
        setLoading(true);
        try {
            const result = await getInvitationsAction(orgId);
            if (Array.isArray(result)) {
                setInvitations(result);
            }
        } catch (error) {
            console.error('Failed to load invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvitations();
    }, [orgId]);

    const handleRevoke = async (inviteId: string) => {
        try {
            const result = await revokeInvitationAction(inviteId);
            if (result.success) {
                toast({ title: 'Invitation Revoked', description: 'The invitation has been cancelled.' });
                loadInvitations();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to revoke invitation.', variant: 'destructive' });
        }
    };

    const copyInviteLink = (token: string) => {
        const link = `${window.location.origin}/join/${token}`;
        navigator.clipboard.writeText(link);
        toast({ title: 'Copied', description: 'Invite link copied to clipboard.' });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
            case 'accepted':
                return <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle className="h-3 w-3" /> Accepted</Badge>;
            case 'expired':
                return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Expired</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const pendingInvites = invitations.filter(i => i.status === 'pending');
    const acceptedInvites = invitations.filter(i => i.status === 'accepted');

    if (!user) {
        return (
            <div className="container mx-auto py-10 px-4">
                <p className="text-muted-foreground">Please log in to manage your team.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team</h1>
                    <p className="text-muted-foreground">Invite team members and manage access.</p>
                </div>
                {getAllowedRoles().length > 0 && (
                    <InviteUserDialog 
                        orgId={orgId}
                        allowedRoles={getAllowedRoles()}
                        onInviteSent={loadInvitations}
                        trigger={
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Team Member
                            </Button>
                        }
                    />
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invites</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingInvites.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{acceptedInvites.length + 1}</div>
                        <p className="text-xs text-muted-foreground">Including you</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Your Role</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="text-lg capitalize">{userRole || 'Member'}</Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Invitations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Invitations</CardTitle>
                    <CardDescription>Manage pending and past invitations.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : invitations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No invitations yet.</p>
                            <p className="text-sm">Invite team members to collaborate.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sent</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell className="font-medium">{invite.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">
                                                {invite.role.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(invite.status)}</TableCell>
                                        <TableCell className="text-muted-foreground" suppressHydrationWarning>
                                            {new Date(invite.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {invite.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => copyInviteLink(invite.token)}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRevoke(invite.id)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
