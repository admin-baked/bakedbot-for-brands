import { FFFAuditTool } from "@/components/audit/fff-audit-tool";

export default async function FFFAuditLeadMagnetCompact({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const initialUrl = typeof params.url === "string" ? decodeURIComponent(params.url) : "";

    return <FFFAuditTool isInternal={false} showHeader={true} initialUrl={initialUrl} />;
}
