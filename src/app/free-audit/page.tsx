import { FFFAuditTool } from "@/components/audit/fff-audit-tool";
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Free Cannabis SEO & Compliance Audit | BakedBot AI',
    description: 'Get a comprehensive audit of your cannabis brand’s search visibility and compliance health.',
};

export default async function FFFAuditLeadMagnetCompact({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const initialUrl = typeof params.url === "string" ? decodeURIComponent(params.url) : "";

    return <FFFAuditTool isInternal={false} showHeader={true} initialUrl={initialUrl} />;
}
