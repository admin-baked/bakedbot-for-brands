export type UnsubscribeTokenPayload = {
    email: string;
    orgId: string;
};

export function decodeUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
    try {
        const decoded = Buffer.from(token, 'base64url').toString('utf8');
        const [email, orgId] = decoded.split('|');
        if (!email || !orgId) return null;
        return { email: email.toLowerCase(), orgId };
    } catch {
        return null;
    }
}

export function encodeUnsubscribeToken(email: string, orgId: string): string {
    return Buffer.from(`${email.toLowerCase()}|${orgId}`).toString('base64url');
}
