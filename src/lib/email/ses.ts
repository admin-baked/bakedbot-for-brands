/**
 * Amazon SES email sender
 *
 * Used for transactional email (internal reports, partner alerts, ops notifications).
 * SES has no cannabis industry restrictions — preferred over Mailjet/SendGrid.
 *
 * Required env vars:
 *   AWS_SES_ACCESS_KEY_ID
 *   AWS_SES_SECRET_ACCESS_KEY
 *   AWS_SES_REGION (default: us-east-1)
 */

import {
    SESClient,
    SendEmailCommand,
    VerifyDomainIdentityCommand,
    VerifyDomainDkimCommand,
    GetIdentityVerificationAttributesCommand,
    GetIdentityDkimAttributesCommand,
    DeleteIdentityCommand,
} from '@aws-sdk/client-ses';
import { logger } from '@/lib/logger';

export interface SesEmailOptions {
    to: string | string[];
    from: string;
    fromName?: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    replyTo?: string;
    /** List-Unsubscribe URLs for bulk campaign sends (RFC 2369 / RFC 8058 / SES requirements) */
    listUnsubscribeUrls?: string[];
}

function getClient(): SESClient {
    return new SESClient({
        region: process.env.AWS_SES_REGION ?? 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
        },
    });
}

export async function sendSesEmail(opts: SesEmailOptions): Promise<void> {
    const client = getClient();
    const toAddresses = Array.isArray(opts.to) ? opts.to : [opts.to];
    const fromAddress = opts.fromName
        ? `${opts.fromName} <${opts.from}>`
        : opts.from;

    // Build List-Unsubscribe headers for bulk sends (SES / CAN-SPAM / RFC 8058 compliance)
    // One-click POST unsubscribe (RFC 8058) + traditional mailto fallback
    const listUnsubscribeHeader = opts.listUnsubscribeUrls?.length
        ? opts.listUnsubscribeUrls.map(u => `<${u}>`).join(', ')
        : undefined;
    const listUnsubscribePostHeader = opts.listUnsubscribeUrls?.find(u => u.startsWith('http'))
        ? 'List-Unsubscribe=One-Click'
        : undefined;

    const command = new SendEmailCommand({
        Source: fromAddress,
        Destination: { ToAddresses: toAddresses },
        Message: {
            Subject: { Data: opts.subject, Charset: 'UTF-8' },
            Body: {
                Html: { Data: opts.htmlBody, Charset: 'UTF-8' },
                ...(opts.textBody && { Text: { Data: opts.textBody, Charset: 'UTF-8' } }),
            },
        },
        ...(opts.replyTo && { ReplyToAddresses: [opts.replyTo] }),
        ...(listUnsubscribeHeader && {
            Tags: [], // placeholder — SES custom headers go via ConfigurationSet in prod
        }),
    });

    // Note: SES SendEmailCommand doesn't support arbitrary headers directly.
    // List-Unsubscribe is injected via the HTML body footer (appendUnsubscribeFooter in campaign-sender).
    // For full RFC 8058 header support, upgrade to SendRawEmailCommand (future task).

    try {
        const result = await client.send(command);
        logger.info('[SES] Email sent', { messageId: result.MessageId, to: toAddresses });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error('[SES] Send failed', { error: msg, to: toAddresses, subject: opts.subject });
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// Domain verification — tenant custom sending domains
// ─────────────────────────────────────────────────────────────

export interface SesDomainVerification {
    domain: string;
    verificationStatus: 'Pending' | 'Success' | 'Failed' | 'TemporaryFailure' | 'NotStarted';
    verificationToken: string | null;
    dkimStatus: 'Pending' | 'Success' | 'Failed' | 'TemporaryFailure' | 'NotStarted';
    dkimTokens: string[];
}

/** Initiate domain verification — returns TXT token + DKIM CNAME tokens */
export async function verifySesDomain(domain: string): Promise<{
    verificationToken: string;
    dkimTokens: string[];
}> {
    const client = getClient();

    const [identityResult, dkimResult] = await Promise.all([
        client.send(new VerifyDomainIdentityCommand({ Domain: domain })),
        client.send(new VerifyDomainDkimCommand({ Domain: domain })),
    ]);

    const verificationToken = identityResult.VerificationToken!;
    const dkimTokens = dkimResult.DkimTokens ?? [];

    logger.info('[SES] Domain verification initiated', { domain, dkimTokenCount: dkimTokens.length });
    return { verificationToken, dkimTokens };
}

/** Check current verification + DKIM status for a domain */
export async function getSesDomainStatus(domain: string): Promise<SesDomainVerification> {
    const client = getClient();

    const [verifyResult, dkimResult] = await Promise.all([
        client.send(new GetIdentityVerificationAttributesCommand({ Identities: [domain] })),
        client.send(new GetIdentityDkimAttributesCommand({ Identities: [domain] })),
    ]);

    const verifyAttrs = verifyResult.VerificationAttributes?.[domain];
    const dkimAttrs = dkimResult.DkimAttributes?.[domain];

    return {
        domain,
        verificationStatus: (verifyAttrs?.VerificationStatus as SesDomainVerification['verificationStatus']) ?? 'NotStarted',
        verificationToken: verifyAttrs?.VerificationToken ?? null,
        dkimStatus: (dkimAttrs?.DkimVerificationStatus as SesDomainVerification['dkimStatus']) ?? 'NotStarted',
        dkimTokens: dkimAttrs?.DkimTokens ?? [],
    };
}

/** Remove a domain identity from SES */
export async function removeSesDomain(domain: string): Promise<void> {
    const client = getClient();
    await client.send(new DeleteIdentityCommand({ Identity: domain }));
    logger.info('[SES] Domain identity removed', { domain });
}

/**
 * Returns the DNS records a tenant needs to add for SES domain verification.
 * Works for both Cloudflare-managed and manual DNS setups.
 */
export function getSesDnsRecords(domain: string, verificationToken: string, dkimTokens: string[]): Array<{
    type: 'TXT' | 'CNAME';
    name: string;
    value: string;
    purpose: 'verification' | 'dkim' | 'spf' | 'dmarc';
}> {
    const records: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string; purpose: 'verification' | 'dkim' | 'spf' | 'dmarc' }> = [
        // Domain ownership verification
        { type: 'TXT', name: `_amazonses.${domain}`, value: verificationToken, purpose: 'verification' },
        // SPF — authorize SES
        { type: 'TXT', name: domain, value: 'v=spf1 include:amazonses.com ~all', purpose: 'spf' },
        // DMARC — minimum policy
        { type: 'TXT', name: `_dmarc.${domain}`, value: 'v=DMARC1; p=none; rua=mailto:dmarc@bakedbot.ai', purpose: 'dmarc' },
    ];

    // DKIM CNAME records (typically 3)
    for (const token of dkimTokens) {
        records.push({
            type: 'CNAME',
            name: `${token}._domainkey.${domain}`,
            value: `${token}.dkim.amazonses.com`,
            purpose: 'dkim',
        });
    }

    return records;
}
