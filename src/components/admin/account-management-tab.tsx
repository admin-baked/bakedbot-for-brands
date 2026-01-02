'use client';

/**
 * Account Management Tab for Super Users
 * Allows deletion of user accounts and organizations for testing
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Trash2, AlertTriangle } from 'lucide-react';
import {
    getAllUsers,
    promoteToSuperUser,
} from '@/app/dashboard/ceo/actions';
import {
    deleteUserAccount,
} from '@/server/actions/delete-account';
import {
    getAllBrands,
    getAllDispensaries,
    deleteBrand,
    deleteDispensary,
} from '@/server/actions/delete-organization';

interface User {
    id: string; // Changed from uid to match new action
    email: string | null;
    displayName: string | null;
    role: string | null;
    roles?: string[]; // Added
    customClaims?: any; // Added
    createdAt: string | null;
}

interface Organization {
    id: string;
    name: string;
    claimed: boolean;
    pageCount: number;
}

export function AccountManagementTab() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('users');

    // Users state
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Brands state
    const [brands, setBrands] = useState<Organization[]>([]);
    const [filteredBrands, setFilteredBrands] = useState<Organization[]>([]);
    const [brandSearch, setBrandSearch] = useState('');
    const [loadingBrands, setLoadingBrands] = useState(true);

    // Dispensaries state
    const [dispensaries, setDispensaries] = useState<Organization[]>([]);
    const [filteredDispensaries, setFilteredDispensaries] = useState<Organization[]>([]);
    const [dispensarySearch, setDispensarySearch] = useState('');
    const [loadingDispensaries, setLoadingDispensaries] = useState(true);

    // Delete dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        open: boolean;
        type: 'user' | 'brand' | 'dispensary';
        id: string;
        name: string;
    }>({ open: false, type: 'user', id: '', name: '' });

    // Load users
    useEffect(() => {
        loadUsers();
    }, []);

    // Load brands
    useEffect(() => {
        if (activeTab === 'organizations') {
            loadOrganizations();
        }
    }, [activeTab]);

    // Filter users
    useEffect(() => {
        if (!userSearch) {
            setFilteredUsers(users);
        } else {
            const search = userSearch.toLowerCase();
            setFilteredUsers(
                users.filter(
                    (u) =>
                        u.email?.toLowerCase().includes(search) ||
                        u.displayName?.toLowerCase().includes(search) ||
                        u.role?.toLowerCase().includes(search)
                )
            );
        }
    }, [users, userSearch]);

    // Filter brands
    useEffect(() => {
        if (!brandSearch) {
            setFilteredBrands(brands);
        } else {
            const search = brandSearch.toLowerCase();
            setFilteredBrands(brands.filter((b) => b.name.toLowerCase().includes(search)));
        }
    }, [brands, brandSearch]);

    // Filter dispensaries
    useEffect(() => {
        if (!dispensarySearch) {
            setFilteredDispensaries(dispensaries);
        } else {
            const search = dispensarySearch.toLowerCase();
            setFilteredDispensaries(dispensaries.filter((d) => d.name.toLowerCase().includes(search)));
        }
    }, [dispensaries, dispensarySearch]);

    async function loadUsers() {
        try {
            setLoadingUsers(true);
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load users',
                variant: 'destructive',
            });
        } finally {
            setLoadingUsers(false);
        }
    }

    async function loadOrganizations() {
        try {
            setLoadingBrands(true);
            setLoadingDispensaries(true);
            const [brandsData, dispensariesData] = await Promise.all([
                getAllBrands(),
                getAllDispensaries(),
            ]);
            setBrands(brandsData);
            setDispensaries(dispensariesData);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load organizations',
                variant: 'destructive',
            });
        } finally {
            setLoadingBrands(false);
            setLoadingDispensaries(false);
        }
    }

    async function handleDelete() {
        const { type, id } = deleteDialog;

        try {
            let result;
            if (type === 'user') {
                result = await deleteUserAccount(id);
            } else if (type === 'brand') {
                result = await deleteBrand(id);
            } else {
                result = await deleteDispensary(id);
            }

            if (result.success) {
                toast({
                    title: 'Success',
                    description: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
                });

                // Reload data
                if (type === 'user') {
                    loadUsers();
                } else {
                    loadOrganizations();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete',
                variant: 'destructive',
            });
        } finally {
            setDeleteDialog((prev) => ({ ...prev, open: false }));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 border border-orange-500/50 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                    <h3 className="font-semibold text-sm">Super User Only - Testing Feature</h3>
                    <p className="text-sm text-muted-foreground">
                        This tool permanently deletes accounts and organizations. Use only for testing purposes.
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="users">User Accounts</TabsTrigger>
                    <TabsTrigger value="organizations">Organizations</TabsTrigger>
                </TabsList>

                {/* User Accounts Tab */}
                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Accounts</CardTitle>
                            <CardDescription>
                                Manage and delete user accounts. Super User accounts cannot be deleted.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by email, name, or role..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>

                            {loadingUsers ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="w-[150px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium">{user.email || 'N/A'}</TableCell>
                                                    <TableCell>{user.displayName || 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <Badge variant="outline">{user.role || 'none'}</Badge>
                                                            {user.roles && user.roles.length > 0 && (
                                                                <span className="text-xs text-muted-foreground">{user.roles.join(', ')}</span>
                                                            )}
                                                            {/* Show Super User Badge if applicable */}
                                                            {(user.role === 'super_user' || user.role === 'owner' || user.customClaims?.super_user) && (
                                                                <Badge className="w-fit bg-green-100 text-green-700 border-green-200">Super User</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell suppressHydrationWarning>
                                                        {user.createdAt
                                                            ? new Date(user.createdAt).toLocaleDateString()
                                                            : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {/* Promote Button */}
                                                            {user.role !== 'owner' && user.role !== 'super_user' && !user.customClaims?.super_user && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        try {
                                                                            const res = await promoteToSuperUser(user.id);
                                                                            if (res.success) {
                                                                                toast({ title: "Success", description: "User promoted to Super User" });
                                                                                loadUsers();
                                                                            } else {
                                                                                toast({ title: "Error", description: res.message, variant: "destructive" });
                                                                            }
                                                                        } catch (e) {
                                                                             toast({ title: "Error", description: "Failed to promote", variant: "destructive" });
                                                                        }
                                                                    }}
                                                                >
                                                                    <Loader2 className="mr-2 h-3 w-3" /> 
                                                                    Promote
                                                                </Button>
                                                            )}

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    setDeleteDialog({
                                                                        open: true,
                                                                        type: 'user',
                                                                        id: user.id,
                                                                        name: user.email || user.displayName || user.id,
                                                                    })
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
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

                {/* Organizations Tab */}
                <TabsContent value="organizations" className="space-y-4">
                    {/* Brands */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Brands</CardTitle>
                            <CardDescription>Manage and delete brand organizations and their data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search brands..."
                                    value={brandSearch}
                                    onChange={(e) => setBrandSearch(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>

                            {loadingBrands ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Pages</TableHead>
                                                <TableHead className="w-[100px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBrands.map((brand) => (
                                                <TableRow key={brand.id}>
                                                    <TableCell className="font-medium">{brand.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={brand.claimed ? 'default' : 'secondary'}>
                                                            {brand.claimed ? 'Claimed' : 'Unclaimed'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{brand.pageCount}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setDeleteDialog({
                                                                    open: true,
                                                                    type: 'brand',
                                                                    id: brand.id,
                                                                    name: brand.name,
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
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

                    {/* Dispensaries */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dispensaries</CardTitle>
                            <CardDescription>Manage and delete dispensary organizations and their data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search dispensaries..."
                                    value={dispensarySearch}
                                    onChange={(e) => setDispensarySearch(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>

                            {loadingDispensaries ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Pages</TableHead>
                                                <TableHead className="w-[100px]">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredDispensaries.map((dispensary) => (
                                                <TableRow key={dispensary.id}>
                                                    <TableCell className="font-medium">{dispensary.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={dispensary.claimed ? 'default' : 'secondary'}>
                                                            {dispensary.claimed ? 'Claimed' : 'Unclaimed'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{dispensary.pageCount}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setDeleteDialog({
                                                                    open: true,
                                                                    type: 'dispensary',
                                                                    id: dispensary.id,
                                                                    name: dispensary.name,
                                                                })
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
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
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
                title={`Delete ${deleteDialog.type.charAt(0).toUpperCase() + deleteDialog.type.slice(1)}`}
                description={`This will permanently delete this ${deleteDialog.type} and ALL associated data including SEO pages, products, claims, and user associations.`}
                itemName={deleteDialog.name}
                onConfirm={handleDelete}
            />
        </div>
    );
}
