'use client';

import { useState, useEffect } from 'react';
import { InviteUserDialog } from '@/components/dashboard/admin/invite-user-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getAllUsers, promoteToSuperUser } from '../actions';
import { Loader2, ShieldAlert, CheckCircle } from 'lucide-react';

export default function SuperAdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        const data = await getAllUsers();
        setUsers(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handlePromote = async (uid: string, email: string) => {
        if (!confirm(`Are you sure you want to promote ${email} to Super User? This grants full system access.`)) return;

        try {
            const result = await promoteToSuperUser(uid);
            if (result.success) {
                toast({
                    title: 'User Promoted',
                    description: `${email} is now a Super User. They may need to re-login.`,
                });
                fetchUsers(); // Refresh list
            } else {
                toast({
                    title: 'Promotion Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error',
                description: 'Failed to promote user.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Provision accounts and invite users (Live Onboarding supported).</p>
                </div>
                <InviteUserDialog />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => {
                                    const isSuperUser = user.roles?.includes('super_user') || user.customClaims?.role === 'super_user';
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.displayName || 'No Name'}</span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {user.roles?.map((r: string) => (
                                                        <Badge key={r} variant="outline" className="capitalize text-xs">
                                                            {r.replace('_', ' ')}
                                                        </Badge>
                                                    ))}
                                                    {!user.roles?.length && <Badge variant="secondary" className="text-xs">User</Badge>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isSuperUser ? (
                                                    <div className="flex justify-end items-center gap-1 text-emerald-600 text-xs font-medium">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Super User
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        onClick={() => handlePromote(user.id, user.email)}
                                                    >
                                                        <ShieldAlert className="h-3 w-3 mr-1" />
                                                        Promote
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
