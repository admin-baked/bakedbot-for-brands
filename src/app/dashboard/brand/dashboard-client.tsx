'use client';

import { BrandOverviewView } from './components/brand-overview-view';

export default function BrandDashboardClient({ brandId }: { brandId: string }) {
    return <BrandOverviewView brandId={brandId} />;
}
