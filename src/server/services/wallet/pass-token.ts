import { createHmac } from 'crypto';

export const WALLET_PASS_TOKEN_TTL_MS = 15 * 60 * 1000;

function signPassTokenPayload(payload: string): string {
    const secret = process.env.CRON_SECRET || 'dev-secret';
    return createHmac('sha256', secret).update(payload).digest('hex');
}

export function buildPassToken(customerId: string, orgId: string, expiresAt: number): string {
    const payload = `${customerId}:${orgId}:${expiresAt}`;
    const signature = signPassTokenPayload(payload);
    return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifyPassToken(
    token: string
): { customerId: string; orgId: string } | null {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const parts = decoded.split(':');
        if (parts.length !== 4) {
            return null;
        }

        const [customerId, orgId, expiresAtStr, signature] = parts;
        const expiresAt = Number.parseInt(expiresAtStr, 10);
        if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
            return null;
        }

        const payload = `${customerId}:${orgId}:${expiresAtStr}`;
        const expectedSignature = signPassTokenPayload(payload);
        if (signature !== expectedSignature) {
            return null;
        }

        return { customerId, orgId };
    } catch {
        return null;
    }
}
