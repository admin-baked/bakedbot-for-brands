'use client';

import { useParams } from 'next/navigation';
import LoyaltyTabletPage from '../../../loyalty-tablet/page';

export default function LoyaltyTabletOrgPage() {
    const params = useParams();
    const orgId = params.orgId as string;

    // Inject orgId into window location search params
    if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('orgId', orgId);
        window.history.replaceState({}, '', url.toString());
    }

    return <LoyaltyTabletPage />;
}