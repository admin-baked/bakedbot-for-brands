'use client';

import { useUserRole, Role } from '@/hooks/use-user-role';
import { useImpersonation } from '@/context/impersonation-context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShieldAlert, UserCog, Building2 } from 'lucide-react';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { getOrgsForSuperUser } from '@/server/actions/team-management';

export function RoleSwitcher() {
    const { canAccessAdminFeatures, role } = useUserRole();
    const { impersonate, stopImpersonating, isImpersonating, impersonatedRole } = useImpersonation();
    const [showOrgSelector, setShowOrgSelector] = useState(false);
    const [orgs, setOrgs] = useState<Array<{ id: string; name: string; type: string }>>([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [impersonatedOrgId, setImpersonatedOrgId] = useState<string | null>(
        typeof window !== 'undefined' ? (document.cookie.split('; ').find(row => row.startsWith('x-impersonated-org-id='))?.split('=')[1] || null) : null
    );

    if (!canAccessAdminFeatures) {
        return null;
    }

    const handleImpersonate = (newRole: Role) => {
        if (newRole === 'super_user') {
            stopImpersonating();
        } else {
            impersonate(newRole);
        }
    };

    const loadOrgs = async () => {
        setLoadingOrgs(true);
        try {
            const result = await getOrgsForSuperUser(50, 0);
            if (result.success && result.data) {
                setOrgs(result.data);
            }
        } catch (error) {
            console.error('[RoleSwitcher] Failed to load orgs:', error);
        }
        setLoadingOrgs(false);
    };

    const handleSelectOrg = (orgId: string) => {
        // Set cookie and reload
        document.cookie = `x-impersonated-org-id=${orgId}; path=/; max-age=31536000`;
        setImpersonatedOrgId(orgId);
        window.location.reload();
    };

    const handleClearOrgImpersonation = () => {
        // Clear cookie and reload
        document.cookie = 'x-impersonated-org-id=; path=/; max-age=0';
        setImpersonatedOrgId(null);
        window.location.reload();
    };

    return (
        <>
            <div className="fixed bottom-4 right-4 z-50">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={isImpersonating || impersonatedOrgId ? "destructive" : "default"}
                            size="sm"
                            className="shadow-lg"
                        >
                            {impersonatedOrgId ? (
                                <>
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Org Impersonating
                                </>
                            ) : isImpersonating ? (
                                <>
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Impersonating: {impersonatedRole?.toUpperCase()}
                                </>
                            ) : (
                                <>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Admin Controls
                                </>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Impersonate Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleImpersonate('super_user')}>
                            Super User (Reset)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImpersonate('brand')}>
                            Brand User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImpersonate('dispensary')}>
                            Dispensary User
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImpersonate('customer')}>
                            Customer
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Impersonate Org</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => {
                                loadOrgs();
                                setShowOrgSelector(true);
                            }}
                        >
                            <Building2 className="mr-2 h-4 w-4" />
                            View as Org...
                        </DropdownMenuItem>

                        {impersonatedOrgId && (
                            <DropdownMenuItem onClick={handleClearOrgImpersonation}>
                                Clear Org Impersonation
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={showOrgSelector} onOpenChange={setShowOrgSelector}>
                <DialogContent className="max-w-2xl max-h-96">
                    <DialogHeader>
                        <DialogTitle>Impersonate Organization</DialogTitle>
                        <DialogDescription>Select an organization to view as</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 overflow-y-auto max-h-80">
                        {loadingOrgs ? (
                            <div className="text-center py-4 text-muted-foreground">Loading organizations...</div>
                        ) : orgs.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">No organizations found</div>
                        ) : (
                            orgs.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => handleSelectOrg(org.id)}
                                    className="w-full text-left px-4 py-3 rounded border border-border hover:bg-muted transition-colors"
                                >
                                    <div className="font-medium">{org.name}</div>
                                    <div className="text-xs text-muted-foreground capitalize">{org.type}</div>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
