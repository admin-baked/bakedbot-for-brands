import { requireUser } from '@/server/auth/auth';
import { ScenarioForm } from '../builder-form';

export const metadata = {
    title: 'New Scenario | Simulation Mode',
};

export default async function NewScenarioPage() {
    await requireUser(['brand', 'dispensary', 'owner']);

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Create New Scenario</h1>
            <ScenarioForm mode="create" />
        </div>
    );
}
