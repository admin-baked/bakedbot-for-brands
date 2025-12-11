import { InviteUserDialog } from '@/components/dashboard/admin/invite-user-dialog';

export default function SuperAdminUsersPage() {
    return (
        <div className="container mx-auto py-10 px-4 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Provision accounts and invite users (Live Onboarding supported).</p>
                </div>
                <InviteUserDialog />
            </div>

            <div className="border rounded-lg p-12 text-center bg-card text-muted-foreground border-dashed">
                <p>User list functionality coming soon.</p>
                <p className="text-sm mt-2">Use the "Invite User" button to onboard new clients.</p>
            </div>
        </div>
    );
}
