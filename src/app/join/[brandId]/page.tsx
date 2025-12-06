import { captureLead } from '@/app/dashboard/leads/actions';
import JoinPageClient from './page-client';

interface JoinPageProps {
    params: {
        brandId: string;
    }
}

export default function JoinPage({ params }: JoinPageProps) {
    // Determine brand name from ID or fetch metadata here
    // For now we pass the ID to the client
    return <JoinPageClient brandId={params.brandId} />;
}
