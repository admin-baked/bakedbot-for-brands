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
import { ShieldAlert, UserCog } from 'lucide-react';

export function RoleSwitcher() {
    const { canAccessAdminFeatures, role } = useUserRole();
    const { impersonate, stopImpersonating, isImpersonating, impersonatedRole } = useImpersonation();

    if (!canAccessAdminFeatures) {
        return null;
    }

    const handleImpersonate = (newRole: Role) => {
        if (newRole === 'owner') {
            stopImpersonating();
        } else {
            impersonate(newRole);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant={isImpersonating ? "destructive" : "default"}
                        size="sm"
                        className="shadow-lg"
                    >
                        {isImpersonating ? (
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
                    <DropdownMenuItem onClick={() => handleImpersonate('owner')}>
                        Owner (Reset)
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
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
