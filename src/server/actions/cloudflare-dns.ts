'use server';

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
    saveCloudflareToken,
    getCloudflareToken,
    getCloudflareIntegration,
    disconnectCloudflare,
    updateCloudflareZone,
} from '@/server/integrations/cloudflare/token-storage';
import {
    verifyToken,
    getZone,
    listDnsRecords,
    upsertDnsRecord,
} from '@/server/integrations/cloudflare/api';
import { getWorkspaceIntegration } from '@/server/integrations/google-workspace/token-storage';

async function resolveOrgId(): Promise<string> {
    const user = await requireUser();
    const orgId = (user as any).currentOrgId || (user as any).locationId || (user as any).brandId;
    if (!orgId) throw new Error('No org associated with this account');
    return orgId;
}

/** Extract the root domain from an email or full domain string */
function extractApexDomain(emailOrDomain: string): string {
    const domain = emailOrDomain.includes('@') ? emailOrDomain.split('@')[1] : emailOrDomain;
    return domain.split('.').slice(-2).join('.');
}

export interface DnsRecordStatus {
    type: string;
    name: string;
    expectedContent: string;
    status: 'present' | 'missing' | 'conflict';
    currentContent?: string;
}

export interface CloudflareStatus {
    connected: boolean;
    zoneName?: string;
    records?: DnsRecordStatus[];
    error?: string;
}

function buildExpectedRecords(domain: string): Array<{ type: string; name: string; content: string; proxied: boolean; ttl: number }> {
    return [
        {
            type: 'TXT',
            name: domain,
            content: 'v=spf1 include:_spf.google.com ~all',
            proxied: false,
            ttl: 3600,
        },
        {
            type: 'TXT',
            name: `_dmarc.${domain}`,
            content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + domain + '; pct=100',
            proxied: false,
            ttl: 3600,
        },
        {
            // DKIM CNAME — Google Workspace generates the actual key in Admin Console.
            // We pre-create the CNAME so DNS is ready as soon as they activate DKIM.
            type: 'CNAME',
            name: `google._domainkey.${domain}`,
            content: 'google._domainkey.googlemail.com',
            proxied: false,
            ttl: 3600,
        },
    ];
}

export async function saveCloudflareApiToken(
    apiToken: string,
): Promise<{ success: boolean; zoneName?: string; error?: string }> {
    try {
        const user = await requireUser();
        const orgId = await resolveOrgId();

        // Verify the token is valid
        const { valid, error } = await verifyToken(apiToken);
        if (!valid) {
            return { success: false, error: error ?? 'Invalid API token' };
        }

        // Resolve the org's domain from connected Workspace email
        const workspace = await getWorkspaceIntegration(orgId);
        const domain = workspace?.sendAs ? extractApexDomain(workspace.sendAs) : null;

        let zoneId: string | undefined;
        let zoneName: string | undefined;

        if (domain) {
            const zone = await getZone(apiToken, domain);
            if (zone) {
                zoneId = zone.id;
                zoneName = zone.name;
            }
        }

        await saveCloudflareToken(orgId, user.uid, apiToken, zoneId, zoneName);
        return { success: true, zoneName };
    } catch (e: any) {
        logger.error('[CloudflareDns] saveApiToken failed', { error: e.message });
        return { success: false, error: e.message };
    }
}

export async function getCloudflareStatus(): Promise<CloudflareStatus> {
    try {
        const orgId = await resolveOrgId();
        const integration = await getCloudflareIntegration(orgId);

        if (!integration || integration.status !== 'connected') {
            return { connected: false };
        }

        const token = await getCloudflareToken(orgId);
        if (!token) return { connected: false };

        // Resolve zone if not cached
        let zoneId = integration.zoneId;
        let zoneName = integration.zoneName;

        if (!zoneId) {
            const workspace = await getWorkspaceIntegration(orgId);
            const domain = workspace?.sendAs ? extractApexDomain(workspace.sendAs) : null;
            if (domain) {
                const zone = await getZone(token, domain);
                if (zone) {
                    zoneId = zone.id;
                    zoneName = zone.name;
                    await updateCloudflareZone(orgId, zone.id, zone.name);
                }
            }
        }

        if (!zoneId || !zoneName) {
            return { connected: true, error: 'Could not find Cloudflare zone for your domain' };
        }

        // Check each expected record
        const expected = buildExpectedRecords(zoneName);
        const records: DnsRecordStatus[] = await Promise.all(
            expected.map(async (rec) => {
                const existing = await listDnsRecords(token, zoneId!, rec.type, rec.name);
                if (existing.length === 0) {
                    return { type: rec.type, name: rec.name, expectedContent: rec.content, status: 'missing' as const };
                }
                const match = existing[0];
                // SPF: must include Google's servers (different orgs may add extra includes)
                // DMARC: any v=DMARC1 record is valid (policy strictness varies per org)
                // CNAME: exact match required
                const isMatch = match.content === rec.content
                    || (rec.type === 'TXT' && rec.name === zoneName && match.content.includes('v=spf1') && match.content.includes('_spf.google.com'))
                    || (rec.type === 'TXT' && rec.name.startsWith('_dmarc.') && match.content.startsWith('v=DMARC1'));
                return {
                    type: rec.type,
                    name: rec.name,
                    expectedContent: rec.content,
                    status: isMatch ? 'present' as const : 'conflict' as const,
                    currentContent: match.content,
                };
            })
        );

        return { connected: true, zoneName, records };
    } catch (e: any) {
        logger.error('[CloudflareDns] getStatus failed', { error: e.message });
        return { connected: false, error: e.message };
    }
}

export interface ApplyResult {
    success: boolean;
    results?: Array<{ name: string; action: string }>;
    error?: string;
}

export async function applyEmailDnsRecords(): Promise<ApplyResult> {
    try {
        const orgId = await resolveOrgId();
        const token = await getCloudflareToken(orgId);
        if (!token) return { success: false, error: 'Cloudflare not connected' };

        const integration = await getCloudflareIntegration(orgId);
        let zoneId = integration?.zoneId;
        let zoneName = integration?.zoneName;

        if (!zoneId || !zoneName) {
            const workspace = await getWorkspaceIntegration(orgId);
            const domain = workspace?.sendAs ? extractApexDomain(workspace.sendAs) : null;
            if (!domain) return { success: false, error: 'No domain found — connect Google Workspace first' };

            const zone = await getZone(token, domain);
            if (!zone) return { success: false, error: `No active Cloudflare zone found for ${domain}` };
            zoneId = zone.id;
            zoneName = zone.name;
            await updateCloudflareZone(orgId, zone.id, zone.name);
        }

        const records = buildExpectedRecords(zoneName);
        const results = await Promise.all(
            records.map(async (rec) => {
                const { action } = await upsertDnsRecord(token, zoneId!, rec);
                return { name: rec.name, action };
            })
        );

        logger.info('[CloudflareDns] Applied email DNS records', { orgId, zoneName, results });
        return { success: true, results };
    } catch (e: any) {
        logger.error('[CloudflareDns] applyEmailDnsRecords failed', { error: e.message });
        return { success: false, error: e.message };
    }
}

/**
 * Apply SES DNS records via Cloudflare for tenants who manage DNS with us.
 * Reads the pending SES verification tokens from the org's SES integration
 * and creates the required TXT (verification, SPF, DMARC) + CNAME (DKIM) records.
 */
export async function applySesDnsRecords(): Promise<ApplyResult> {
    try {
        const orgId = await resolveOrgId();
        const token = await getCloudflareToken(orgId);
        if (!token) return { success: false, error: 'Cloudflare not connected' };

        const integration = await getCloudflareIntegration(orgId);
        if (!integration?.zoneId || !integration?.zoneName) {
            return { success: false, error: 'Cloudflare zone not configured — connect Cloudflare first' };
        }

        const { getAdminFirestore } = await import('@/firebase/admin');
        const firestore = getAdminFirestore();
        const sesDoc = await firestore
            .collection('organizations').doc(orgId)
            .collection('integrations').doc('ses')
            .get();

        const sesData = sesDoc.data();
        if (!sesData?.dnsRecords || sesData.dnsRecords.length === 0) {
            return { success: false, error: 'No SES DNS records found — initiate domain verification first' };
        }

        // Convert SES DNS records to Cloudflare upsert format
        const cfRecords = (sesData.dnsRecords as Array<{ type: string; name: string; value: string; purpose: string }>).map(rec => ({
            type: rec.type,
            name: rec.name,
            content: rec.value,
            proxied: false,
            ttl: 3600,
        }));

        const results = await Promise.all(
            cfRecords.map(async (rec) => {
                const { action } = await upsertDnsRecord(token, integration.zoneId!, rec);
                return { name: rec.name, action };
            })
        );

        logger.info('[CloudflareDns] Applied SES DNS records', { orgId, zone: integration.zoneName, results });
        return { success: true, results };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[CloudflareDns] applySesDnsRecords failed', { error: msg });
        return { success: false, error: msg };
    }
}

export async function disconnectCloudflareAction(): Promise<{ success: boolean }> {
    try {
        const orgId = await resolveOrgId();
        await disconnectCloudflare(orgId);
        return { success: true };
    } catch (e: any) {
        logger.error('[CloudflareDns] disconnect failed', { error: e.message });
        return { success: false };
    }
}
