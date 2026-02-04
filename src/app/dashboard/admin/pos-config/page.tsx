import { requireSuperUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import { getAllLocations } from './actions';
import { POSConfigClient } from './pos-config-client';

export default async function POSConfigPage() {
    try {
        await requireSuperUser();
    } catch {
        redirect('/login');
    }

    const locations = await getAllLocations();

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">POS Configuration</h1>
                <p className="text-muted-foreground mt-2">
                    Configure Point of Sale integrations for dispensary locations.
                </p>
            </div>

            <POSConfigClient initialLocations={locations} />
        </div>
    );
}
