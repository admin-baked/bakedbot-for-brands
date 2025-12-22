import { notFound } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { getScenario } from '../../actions';
import { ScenarioForm } from '../../builder-form';

export const metadata = {
    title: 'Edit Scenario | Simulation Mode',
};

export default async function EditScenarioPage({ params }: { params: { id: string } }) {
    await requireUser(['brand', 'dispensary', 'owner']);

    const scenario = await getScenario(params.id);

    if (!scenario) {
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Edit Scenario: {scenario.name}</h1>
            <ScenarioForm mode="edit" initialData={scenario} />
        </div>
    );
}
