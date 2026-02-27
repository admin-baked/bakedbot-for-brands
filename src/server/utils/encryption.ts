import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getSecretKey(): Buffer {
    const rawKey = process.env.TOKEN_ENCRYPTION_KEY?.trim();
    if (!rawKey) {
        throw new Error('TOKEN_ENCRYPTION_KEY is required');
    }

    const rawBuffer = Buffer.from(rawKey, 'utf8');
    if (rawBuffer.length === 32) {
        return rawBuffer;
    }

    // Normalize variable-length secrets into a 32-byte key.
    return crypto.createHash('sha256').update(rawKey, 'utf8').digest();
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    if (!ivHex || textParts.length === 0) {
        throw new Error('Invalid encrypted payload');
    }

    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid encrypted payload');
    }

    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
