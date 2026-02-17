'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Mail, MapPin, UserPlus, Trash2, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUsersByOrg, removeUserFromOrg, updateUserOrgRole } from '@/server/actions/team-management';
import { InviteUserDialog } from '@/components/invitations/invite-user-dialog';
import { InvitationsList } from '@/components/invitations/invitations-list';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface TeamMember {
    id: string;
    email: string;
    displayName: string;
    role: string;
    joinedAt: string;
    approvalStatus: string;
}

interface PendingInvitation {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: Date;
    expiresAt: Date;
}

export default function TeamSettingsPage() {
    const { orgId, role: userRole } = useUserRole();
    const { toast } = useToast();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [selectedUserForRemoval, setSelectedUserForRemoval] = useState<TeamMember | null>(null);
    const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<TeamMember | null>(null);
    const [newRole, setNewRole] = useState<string>('');

    const isOrgAdmin =
        userRole === 'brand_admin' ||
        userRole === 'brand' ||
        userRole === 'dispensary_admin' ||
        userRole === 'dispensary' ||
        userRole === 'super_user';

    const loadTeamData = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const result = await getUsersByOrg(orgId);
            if (result.success && result.data) {
                setMembers(result.data.members);
                setInvitations(result.data.invitations);
            } else {
                toast({
                    title: 'Error loading team',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load team',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [orgId, toast]);

    useEffect(() => {
        loadTeamData();
    }, [loadTeamData]);

    const handleRemoveUser = async (userId: string) => {
        if (!orgId) return;
        setRemovingUserId(userId);
        try {
            const result = await removeUserFromOrg(userId, orgId);
            if (result.success) {
                toast({
                    title: 'User removed',
                    description: result.message,
                });
                setMembers(members.filter(m => m.id !== userId));
            } else {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to remove user',
                variant: 'destructive',
            });
        } finally {
            setRemovingUserId(null);
            setShowRemoveDialog(false);
            setSelectedUserForRemoval(null);
        }
    };

    const handleChangeRole = async (userId: string, role: string) => {
        if (!orgId) return;
        setChangingRoleUserId(userId);
        try {
            const result = await updateUserOrgRole(userId, orgId, role);
            if (result.success) {
                toast({
                    title: 'Role updated',
                    description: result.message,
                });
                setMembers(
                    members.map(m =>
                        m.id === userId ? { ...m, role } : m
                    )
                );
                setSelectedUserForRoleChange(null);
                setNewRole('');
            } else {
                toast({
                    title: 'Error',
                    description: result.error,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update role',
                variant: 'destructive',
            });
        } finally {
            setChangingRoleUserId(null);
        }
    };

    if (!orgId || !isOrgAdmin) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                        You don't have permission to manage this team.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Team Management</h1>
                <p className="text-muted-foreground">Manage members, roles, and invitations for your organization</p>
            </div>

            <Tabs defaultValue="members" className="w-full">
                <TabsList className="bg-muted/50 p-1 border">
                    <TabsTrigger value="members" className="gap-2">
                        <Users className="h-4 w-4" />
                        Members ({members.length})
                    </TabsTrigger>
                    <TabsTrigger value="invitations" className="gap-2">
                        <Mail className="h-4 w-4" />
                        Invitations ({invitations.length})
                    </TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Team Members</CardTitle>
                                <CardDescription>
                                    Manage roles and permissions for your team
                                </CardDescription>
                            </div>
                            <InviteUserDialog
                                orgId={orgId}
                                allowedRoles={
                                    userRole === 'brand' || userRole === 'brand_admin'
                                        ? ['brand', 'brand_admin', 'brand_member']
                                        : userRole === 'dispensary' || userRole === 'dispensary_admin'
                                        ? ['dispensary', 'dispensary_admin', 'dispensary_staff']
                                        : ['brand', 'dispensary', 'customer']
                                }
                                onInviteSent={loadTeamData}
                                trigger={
                                    <Button>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Invite Member
                                    </Button>
                                }
                            />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No team members yet. Invite someone to get started.
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Member</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Joined</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {members.map(member => (
                                                <TableRow key={member.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{member.displayName || 'No Name'}</span>
                                                            <span className="text-xs text-muted-foreground">{member.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="capitalize">
                                                                {member.role.replace('_', ' ')}
                                                            </Badge>
                                                            {member.approvalStatus === 'pending' && (
                                                                <Badge variant="secondary" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                                                                    Pending
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(member.joinedAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2 flex justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedUserForRoleChange(member);
                                                                setNewRole(member.role);
                                                            }}
                                                            disabled={changingRoleUserId === member.id}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => {
                                                                setSelectedUserForRemoval(member);
                                                                setShowRemoveDialog(true);
                                                            }}
                                                            disabled={removingUserId === member.id}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Invitations Tab */}
                <TabsContent value="invitations" className="mt-6 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Invitations</CardTitle>
                            <CardDescription>
                                Manage pending team member invitations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InvitationsList
                                allowedRoles={
                                    userRole === 'brand' || userRole === 'brand_admin'
                                        ? ['brand', 'brand_admin']
                                        : ['dispensary', 'dispensary_admin']
                                }
                                orgId={orgId}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Role Change Dialog */}
            {selectedUserForRoleChange && (
                <AlertDialog open={!!selectedUserForRoleChange} onOpenChange={() => setSelectedUserForRoleChange(null)}>
                    <AlertDialogContent>
                        <AlertDialogTitle>Change User Role</AlertDialogTitle>
                        <AlertDialogDescription>
                            Update the role for {selectedUserForRoleChange.displayName}
                        </AlertDialogDescription>
                        <div className="py-4">
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select new role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {userRole === 'brand' || userRole === 'brand_admin' ? (
                                        <>
                                            <SelectItem value="brand_admin">Brand Admin</SelectItem>
                                            <SelectItem value="brand_member">Brand Member</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="dispensary_admin">Dispensary Admin</SelectItem>
                                            <SelectItem value="dispensary_staff">Dispensary Staff</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => handleChangeRole(selectedUserForRoleChange.id, newRole)}
                                disabled={changingRoleUserId === selectedUserForRoleChange.id || newRole === selectedUserForRoleChange.role}
                            >
                                {changingRoleUserId === selectedUserForRoleChange.id ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Update Role'
                                )}
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Remove User Dialog */}
            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                <AlertDialogContent>
                    <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to remove {selectedUserForRemoval?.displayName} from your organization? They will lose access to all organization data.
                    </AlertDialogDescription>
                    <div className="flex gap-3 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => selectedUserForRemoval && handleRemoveUser(selectedUserForRemoval.id)}
                            disabled={removingUserId === selectedUserForRemoval?.id}
                        >
                            {removingUserId === selectedUserForRemoval?.id ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                'Remove Member'
                            )}
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
