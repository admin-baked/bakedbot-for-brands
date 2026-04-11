import { redirect } from 'next/navigation';

export default async function FreeAuditPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const nextParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
            nextParams.set(key, value);
            continue;
        }

        if (Array.isArray(value)) {
            for (const entry of value) {
                nextParams.append(key, entry);
            }
        }
    }

    redirect(`/ai-retention-audit${nextParams.size > 0 ? `?${nextParams.toString()}` : ''}`);
}
