// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { ScenarioForm } from '../builder-form';

export const metadata = {
    title: 'New Scenario | Simulation Mode',
};

export default async function NewScenarioPage() {
    await requireUser(['brand', 'dispensary', 'super_user']);

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Create New Scenario</h1>
            <ScenarioForm mode="create" />
        </div>
    );
}
