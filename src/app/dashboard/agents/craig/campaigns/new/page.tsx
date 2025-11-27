
import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import CampaignWizard from '../../components/campaign-wizard';

export default async function NewCampaignPage() {
    try {
        await requireUser(['brand', 'owner']);
    } catch (error) {
        redirect('/dashboard');
    }

    return (
        <main className="flex flex-col gap-6 px-4 py-6 md:px-8 h-[calc(100vh-4rem)]">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">Create New Campaign</h1>
                <p className="text-sm text-muted-foreground">
                    Follow the steps to launch your marketing campaign.
                </p>
            </header>

            <div className="flex-1 overflow-hidden">
                <CampaignWizard />
            </div>
        </main>
    );
}
