
// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { requireUser } from '@/server/auth/auth';
import { redirect } from 'next/navigation';
import CampaignWizard from '../../components/campaign-wizard';

export default async function NewCampaignPage() {
    try {
        await requireUser(['brand', 'super_user']);
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
