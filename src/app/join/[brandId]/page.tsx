import { captureLead } from '@/app/dashboard/leads/actions';
import JoinPageClient from './page-client';

interface JoinPageProps {
    params: Promise<{
        brandId: string;
    }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
    const { brandId } = await params;
    // Determine brand name from ID or fetch metadata here
    // For now we pass the ID to the client
    return <JoinPageClient brandId={brandId} />;
}
