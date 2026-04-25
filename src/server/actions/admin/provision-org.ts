'use server';

import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { sendSesEmail } from '@/lib/email/ses';
import { verifySesDomain, getSesDomainStatus, getSesDnsRecords } from '@/lib/email/ses';
import { upsertDnsRecord } from '@/server/integrations/cloudflare/api';
import {
    SESClient,
    CreateReceiptRuleCommand,
    DescribeReceiptRuleSetCommand,
} from '@aws-sdk/client-ses';

const RULE_SET_NAME = 'bakedbot-inbound';
const SNS_TOPIC_ARN = `arn:aws:sns:us-east-1:493652701435:bakedbot-inbound-email`;
const MX_VALUE = 'inbound-smtp.us-east-1.amazonaws.com';

export type ProvisionStepStatus = 'pending' | 'ok' | 'skipped' | 'error';

export interface ProvisionStep {
    key: string;
    label: string;
    status: ProvisionStepStatus;
    detail?: string;
}

export interface ProvisionResult {
    success: boolean;
    orgId: string;
    steps: ProvisionStep[];
    error?: string;
}

function sesClient() {
    return new SESClient({
        region: process.env.AWS_SES_REGION ?? 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
        },
    });
}

function cfToken(): string {
    const t = process.env.CLOUDFLARE_API_TOKEN;
    if (!t) throw new Error('CLOUDFLARE_API_TOKEN not configured');
    return t;
}

function cfZoneId(): string {
    const z = process.env.CLOUDFLARE_ZONE_ID;
    if (!z) throw new Error('CLOUDFLARE_ZONE_ID not configured');
    return z;
}

function step(key: string, label: string, status: ProvisionStepStatus, detail?: string): ProvisionStep {
    return { key, label, status, detail };
}

export async function provisionOrg(orgId: string): Promise<ProvisionResult> {
    await requireSuperUser();

    const db = getAdminFirestore();
    const steps: ProvisionStep[] = [];

    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
        return { success: false, orgId, steps, error: `Org not found: ${orgId}` };
    }
    const org = orgSnap.data() as Record<string, unknown>;
    const subdomain = org.bakedBotSubdomain as string | undefined;
    const posProvider = (org.posProvider as string | undefined)
        ?? ((await db.collection('organizations').doc(orgId).collection('integrations').doc('pos').get()).data()?.provider as string | undefined);

    if (!subdomain) {
        return {
            success: false,
            orgId,
            steps,
            error: 'bakedBotSubdomain not set on this org. Edit the org doc first.',
        };
    }

    const domain = `${subdomain}.bakedbot.ai`;
    const fromEmail = `hello@${domain}`;
    const provisioning = (org.provisioning ?? {}) as Record<string, unknown>;

    // ── Step 1: SES domain verification ──────────────────────────────────────
    try {
        const status = await getSesDomainStatus(domain);
        if (status.verificationStatus === 'Success') {
            steps.push(step('sesVerified', 'SES domain verification', 'skipped', 'Already verified'));
        } else {
            const { verificationToken, dkimTokens } = await verifySesDomain(domain);
            const dnsRecords = getSesDnsRecords(domain, verificationToken, dkimTokens);

            // Persist tokens so Cloudflare step can apply them
            await orgRef.collection('integrations').doc('ses').set({
                domain,
                fromEmail,
                verificationToken,
                dkimTokens,
                dnsRecords,
                verificationStatus: 'Pending',
                enabled: false,
                updatedAt: new Date(),
            }, { merge: true });

            steps.push(step('sesVerified', 'SES domain verification', 'ok', 'Initiated — DNS records written to integrations/ses'));
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push(step('sesVerified', 'SES domain verification', 'error', msg));
        logger.error('[Provision] SES verify failed', { orgId, error: msg });
    }

    // ── Step 2: Cloudflare DNS — MX + SES verification records ───────────────
    try {
        const token = cfToken();
        const zoneId = cfZoneId();

        // MX for inbound
        const mxResult = await upsertDnsRecord(token, zoneId, {
            type: 'MX', name: domain, content: MX_VALUE, priority: 10, proxied: false, ttl: 1,
        } as Parameters<typeof upsertDnsRecord>[2]);
        steps.push(step('mxRecord', 'Cloudflare MX record', 'ok', `${mxResult.action}: ${domain}`));

        // SES verification + DKIM records (read from integrations/ses if available)
        const sesDoc = await orgRef.collection('integrations').doc('ses').get();
        const sesData = sesDoc.data();
        if (sesData?.dnsRecords?.length) {
            const dnsResults = await Promise.all(
                (sesData.dnsRecords as Array<{ type: 'TXT' | 'CNAME'; name: string; value: string }>)
                    .map(r => upsertDnsRecord(token, zoneId, {
                        type: r.type, name: r.name, content: r.value, proxied: false, ttl: 1,
                    } as Parameters<typeof upsertDnsRecord>[2]))
            );
            const created = dnsResults.filter(r => r.action === 'created').length;
            const unchanged = dnsResults.filter(r => r.action === 'unchanged').length;
            steps.push(step('sesDns', 'SES DNS records (TXT/CNAME)', 'ok',
                `${created} created, ${unchanged} unchanged`));
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push(step('mxRecord', 'Cloudflare MX record', 'error', msg));
        logger.error('[Provision] Cloudflare DNS failed', { orgId, error: msg });
    }

    // ── Step 3: SES receipt rule ──────────────────────────────────────────────
    try {
        const client = sesClient();
        const ruleName = `inbound-${domain.replace(/\./g, '-')}`;

        // Check if rule set exists
        try {
            await client.send(new DescribeReceiptRuleSetCommand({ RuleSetName: RULE_SET_NAME }));
        } catch {
            steps.push(step('sesReceiptRule', 'SES receipt rule', 'error', `Rule set "${RULE_SET_NAME}" not found — run setup-ses-inbound.mjs first`));
            throw new Error('rule set missing');
        }

        try {
            await client.send(new CreateReceiptRuleCommand({
                RuleSetName: RULE_SET_NAME,
                Rule: {
                    Name: ruleName,
                    Enabled: true,
                    TlsPolicy: 'Optional',
                    Recipients: [fromEmail],
                    Actions: [{ SNSAction: { TopicArn: SNS_TOPIC_ARN, Encoding: 'Base64' } }],
                    ScanEnabled: true,
                },
            }));
            steps.push(step('sesReceiptRule', 'SES receipt rule', 'ok', ruleName));
        } catch (e: unknown) {
            const err = e as { name?: string };
            if (err.name === 'AlreadyExistsException') {
                steps.push(step('sesReceiptRule', 'SES receipt rule', 'skipped', 'Already exists'));
            } else throw e;
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!steps.find(s => s.key === 'sesReceiptRule')) {
            steps.push(step('sesReceiptRule', 'SES receipt rule', 'error', msg));
        }
        logger.error('[Provision] SES receipt rule failed', { orgId, error: msg });
    }

    // ── Step 4: Firestore org doc — mark subdomain + integrations/ses ─────────
    try {
        await orgRef.update({
            'provisioning.mxRecord': true,
            'provisioning.sesReceiptRule': true,
            updatedAt: new Date(),
        });
        await orgRef.collection('integrations').doc('ses').set({
            fromEmail,
            fromName: org.name as string ?? subdomain,
            enabled: false, // enable after SES verification completes
            updatedAt: new Date(),
        }, { merge: true });
        steps.push(step('firestore', 'Firestore org config', 'ok', `integrations/ses updated`));
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push(step('firestore', 'Firestore org config', 'error', msg));
    }

    // ── Step 5: POS — Alleaves initial sync ───────────────────────────────────
    if (posProvider === 'alleaves') {
        try {
            const posDoc = await orgRef.collection('integrations').doc('pos').get();
            if (!posDoc.exists || !posDoc.data()?.locationId) {
                steps.push(step('posSync', 'Alleaves POS sync', 'skipped', 'No Alleaves locationId set — configure POS first'));
            } else if (provisioning.posSync) {
                steps.push(step('posSync', 'Alleaves POS sync', 'skipped', 'Already synced'));
            } else {
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bakedbot.ai';
                const cronRes = await fetch(`${baseUrl}/api/cron/pos-sync`, {
                    method: 'POST',
                    headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orgId }),
                });
                if (cronRes.ok) {
                    await orgRef.update({ 'provisioning.posSync': true });
                    steps.push(step('posSync', 'Alleaves POS sync', 'ok', 'Initial sync triggered'));
                } else {
                    steps.push(step('posSync', 'Alleaves POS sync', 'error', `Cron returned ${cronRes.status}`));
                }
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            steps.push(step('posSync', 'Alleaves POS sync', 'error', msg));
        }
    } else {
        steps.push(step('posSync', 'POS sync', 'skipped', posProvider ? `Provider: ${posProvider} (not Alleaves)` : 'No POS configured'));
    }

    // ── Step 6: Ezal competitive intel seed ───────────────────────────────────
    try {
        if (provisioning.ezalSeeded) {
            steps.push(step('ezal', 'Ezal competitive intel', 'skipped', 'Already seeded'));
        } else {
            const orgName = org.name as string ?? orgId;
            const market = (org.market as string | undefined) ?? (org.state as string | undefined) ?? 'New York';
            await db.collection('agent_tasks').add({
                agentId: 'ezal',
                orgId,
                type: 'competitive_snapshot',
                status: 'pending',
                input: { orgName, market, reason: 'Initial provisioning seed' },
                createdAt: new Date(),
            });
            await orgRef.update({ 'provisioning.ezalSeeded': true });
            steps.push(step('ezal', 'Ezal competitive intel', 'ok', `Queued snapshot for ${market}`));
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push(step('ezal', 'Ezal competitive intel', 'error', msg));
    }

    // ── Step 7: Welcome email to org owner ───────────────────────────────────
    try {
        if (provisioning.welcomeEmailSent) {
            steps.push(step('welcomeEmail', 'Welcome email', 'skipped', 'Already sent'));
        } else {
            const ownerId = org.ownerId as string | undefined;
            if (!ownerId) {
                steps.push(step('welcomeEmail', 'Welcome email', 'skipped', 'No ownerId on org'));
            } else {
                const ownerRecord = await getAdminAuth().getUser(ownerId).catch(() => null);
                const ownerEmail = ownerRecord?.email;
                if (!ownerEmail) {
                    steps.push(step('welcomeEmail', 'Welcome email', 'skipped', 'Owner has no email in Auth'));
                } else {
                    await sendSesEmail({
                        from: 'hello@bakedbot.ai',
                        fromName: 'BakedBot AI',
                        to: ownerEmail,
                        subject: `Your BakedBot workspace is being set up — ${org.name as string}`,
                        htmlBody: `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">
  <h2 style="margin-bottom:4px;">Your workspace is being activated 🌿</h2>
  <p style="color:#555;margin-top:0;">Hi there,</p>
  <p>We're wiring up your <strong>${org.name as string}</strong> workspace on BakedBot AI. Here's what's happening in the next 15 minutes:</p>
  <ul style="padding-left:20px;line-height:1.8;color:#333;">
    <li>Your custom email address <strong>${fromEmail}</strong> is being verified with Amazon SES</li>
    <li>DNS records are being configured so customers can reply directly to you</li>
    <li>Your competitive intelligence feed is being seeded for your market</li>
  </ul>
  <p>Once verification completes (~15 min), your agents will be able to send and receive email on your behalf.</p>
  <p style="margin-bottom:4px;">Questions? Reply to this email or reach us at <a href="mailto:martez@bakedbot.ai">martez@bakedbot.ai</a>.</p>
  <p style="color:#888;font-size:13px;margin-top:24px;">— The BakedBot Team</p>
</div>`,
                        textBody: `Your BakedBot workspace (${org.name as string}) is being activated.\n\nYour email address ${fromEmail} is being verified. This takes ~15 minutes.\n\nQuestions? Email martez@bakedbot.ai.`,
                    });
                    await orgRef.update({ 'provisioning.welcomeEmailSent': true });
                    steps.push(step('welcomeEmail', 'Welcome email', 'ok', `Sent to ${ownerEmail}`));
                }
            }
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        steps.push(step('welcomeEmail', 'Welcome email', 'error', msg));
        logger.error('[Provision] Welcome email failed', { orgId, error: msg });
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    const hasError = steps.some(s => s.status === 'error');
    if (!hasError) {
        await orgRef.update({ 'provisioning.completedAt': new Date() });
    }

    logger.info('[Provision] Org provisioning complete', {
        orgId, domain, steps: steps.map(s => `${s.key}:${s.status}`),
    });

    return { success: !hasError, orgId, steps };
}

export async function getProvisionableOrgs(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    bakedBotSubdomain?: string;
    provisioning?: Record<string, unknown>;
    subscriptionStatus: string;
}>> {
    await requireSuperUser();
    const db = getAdminFirestore();
    const snap = await db.collection('organizations').orderBy('name').get();
    return snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            name: data.name ?? d.id,
            type: data.type ?? 'dispensary',
            bakedBotSubdomain: data.bakedBotSubdomain,
            provisioning: data.provisioning,
            subscriptionStatus: data.billing?.subscriptionStatus ?? 'none',
        };
    });
}

export async function setOrgSubdomain(orgId: string, subdomain: string): Promise<{ success: boolean; error?: string }> {
    await requireSuperUser();
    const db = getAdminFirestore();

    // Check uniqueness
    const existing = await db.collection('organizations')
        .where('bakedBotSubdomain', '==', subdomain)
        .limit(1)
        .get();
    if (!existing.empty && existing.docs[0].id !== orgId) {
        return { success: false, error: `Subdomain "${subdomain}" is already used by ${existing.docs[0].data().name}` };
    }

    await db.collection('organizations').doc(orgId).update({
        bakedBotSubdomain: subdomain,
        updatedAt: new Date(),
    });
    return { success: true };
}
