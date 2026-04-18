import { redirect } from 'next/navigation';
import { requireSuperUser } from '@/server/auth/auth';
import { getProvisionableOrgs } from '@/server/actions/admin/provision-org';
import { OrgProvisioningClient } from './org-provisioning-client';

export const dynamic = 'force-dynamic';

export default async function OrgProvisioningPage() {
    try {
        await requireSuperUser();
    } catch {
        redirect('/dashboard');
    }

    const orgs = await getProvisionableOrgs();

    return (
        <div className="container mx-auto py-8 px-4 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Org Provisioning</h1>
                <p className="text-muted-foreground mt-2">
                    1-click setup: SES email, Cloudflare DNS, POS sync, and competitive intel for each org.
                </p>
            </div>
            <OrgProvisioningClient orgs={orgs} />
        </div>
    );
}
