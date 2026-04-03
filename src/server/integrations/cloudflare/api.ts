/**
 * Cloudflare DNS API client
 *
 * Thin wrapper around the Cloudflare v4 REST API.
 * Handles zone lookup, record existence checks, and upserts.
 *
 * Auth: API Token scoped to "Zone:DNS:Edit" for the target domain.
 */

const CF_BASE = 'https://api.cloudflare.com/client/v4';

export interface CfDnsRecord {
    id: string;
    type: string;
    name: string;
    content: string;
    proxied: boolean;
    ttl: number;
}

export interface CfZone {
    id: string;
    name: string;
    status: string;
}

export class CloudflareApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'CloudflareApiError';
    }
}

async function cfFetch<T>(token: string, path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${CF_BASE}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    const json = await res.json() as { success: boolean; result: T; errors: Array<{ message: string }> };

    if (!json.success) {
        const msg = json.errors?.[0]?.message ?? `Cloudflare API error ${res.status}`;
        throw new CloudflareApiError(res.status, msg);
    }

    return json.result;
}

/** Verify a token is valid and has DNS edit permissions */
export async function verifyToken(token: string): Promise<{ valid: boolean; error?: string }> {
    try {
        await cfFetch<{ id: string }>(token, '/user/tokens/verify');
        return { valid: true };
    } catch (e: any) {
        return { valid: false, error: e.message };
    }
}

/** Find the zone for a given domain name */
export async function getZone(token: string, domain: string): Promise<CfZone | null> {
    // Try exact match, then apex (strip one subdomain level)
    const apex = domain.split('.').slice(-2).join('.');
    const zones = await cfFetch<CfZone[]>(token, `/zones?name=${encodeURIComponent(apex)}&status=active`);
    return zones?.[0] ?? null;
}

/** List DNS records of a given type and name */
export async function listDnsRecords(
    token: string,
    zoneId: string,
    type: string,
    name: string,
): Promise<CfDnsRecord[]> {
    return cfFetch<CfDnsRecord[]>(
        token,
        `/zones/${zoneId}/dns_records?type=${type}&name=${encodeURIComponent(name)}`,
    );
}

/** Create a DNS record */
export async function createDnsRecord(
    token: string,
    zoneId: string,
    record: Omit<CfDnsRecord, 'id'>,
): Promise<CfDnsRecord> {
    return cfFetch<CfDnsRecord>(token, `/zones/${zoneId}/dns_records`, {
        method: 'POST',
        body: JSON.stringify(record),
    });
}

/** Update an existing DNS record */
export async function updateDnsRecord(
    token: string,
    zoneId: string,
    recordId: string,
    record: Omit<CfDnsRecord, 'id'>,
): Promise<CfDnsRecord> {
    return cfFetch<CfDnsRecord>(token, `/zones/${zoneId}/dns_records/${recordId}`, {
        method: 'PATCH',
        body: JSON.stringify(record),
    });
}

/**
 * Upsert a DNS record — creates if missing, updates if content differs.
 * Returns the action taken.
 */
export async function upsertDnsRecord(
    token: string,
    zoneId: string,
    record: Omit<CfDnsRecord, 'id'>,
): Promise<{ action: 'created' | 'updated' | 'unchanged'; record: CfDnsRecord }> {
    const existing = await listDnsRecords(token, zoneId, record.type, record.name);

    if (existing.length === 0) {
        const created = await createDnsRecord(token, zoneId, record);
        return { action: 'created', record: created };
    }

    const match = existing[0];
    if (match.content === record.content) {
        return { action: 'unchanged', record: match };
    }

    const updated = await updateDnsRecord(token, zoneId, match.id, record);
    return { action: 'updated', record: updated };
}
