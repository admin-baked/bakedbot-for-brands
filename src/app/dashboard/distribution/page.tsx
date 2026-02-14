// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import WorkInProgress from "@/components/ui/work-in-progress";

export default function DistributionPage() {
    return <WorkInProgress title="Distribution Network" />;
}
