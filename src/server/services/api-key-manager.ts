/**
 * API Key Management Service
 *
 * Creates, validates, and revokes API keys for external consumers.
 * Keys are stored in Firestore with SHA-256 hashed values.
 * Raw key is returned ONCE on creation — never stored.
 */

import { logger } from '@/lib/logger';
import { createHash, randomBytes } from 'crypto';
import type { APIKeyRecord, APIPermission } from '@/types/api-contract';
import { DEFAULT_RATE_LIMIT_PER_MINUTE } from '@/types/api-contract';

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'bb_live_';

function generateRawKey(): string {
    const bytes = randomBytes(32);
    return `${KEY_PREFIX}${bytes.toString('base64url')}`;
}

function hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new API key for an organization.
 * Returns the raw key (shown once) + the stored record.
 */
export async function createAPIKey(
    orgId: string,
    name: string,
    permissions: APIPermission[],
    rateLimitPerMinute?: number,
): Promise<{ key: string; record: APIKeyRecord }> {
    const { createServerClient } = await import('@/firebase/server-client');
    const { firestore } = await createServerClient();

    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, KEY_PREFIX.length + 8);

    const record: Omit<APIKeyRecord, 'id'> = {
        orgId,
        keyHash,
        keyPrefix,
        name,
        permissions,
        rateLimitPerMinute: rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
        createdAt: new Date(),
        active: true,
    };

    const docRef = await firestore.collection('api_keys').add(record);

    logger.info(`[APIKeyManager] Created key "${name}" for org ${orgId}`, {
        keyId: docRef.id,
        keyPrefix,
        permissions,
    });

    return {
        key: rawKey,
        record: { id: docRef.id, ...record },
    };
}

/**
 * Validate an API key and return the record if valid.
 * Returns null if key is invalid, expired, or revoked.
 */
export async function validateAPIKey(rawKey: string): Promise<APIKeyRecord | null> {
    if (!rawKey.startsWith(KEY_PREFIX)) {
        return null;
    }

    const { createServerClient } = await import('@/firebase/server-client');
    const { firestore } = await createServerClient();

    const keyHash = hashKey(rawKey);

    const snap = await firestore
        .collection('api_keys')
        .where('keyHash', '==', keyHash)
        .where('active', '==', true)
        .limit(1)
        .get();

    if (snap.empty) {
        return null;
    }

    const doc = snap.docs[0];
    const data = doc.data();
    const record: APIKeyRecord = {
        id: doc.id,
        orgId: data.orgId,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        name: data.name,
        permissions: data.permissions,
        rateLimitPerMinute: data.rateLimitPerMinute,
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
        lastUsedAt: data.lastUsedAt?.toDate?.() ?? (data.lastUsedAt ? new Date(data.lastUsedAt) : undefined),
        expiresAt: data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : undefined),
        active: data.active,
    };

    // Check expiration
    if (record.expiresAt && record.expiresAt < new Date()) {
        return null;
    }

    // Update lastUsedAt (non-blocking)
    void doc.ref.update({ lastUsedAt: new Date() }).catch(() => {});

    return record;
}

/**
 * Revoke an API key by ID.
 */
export async function revokeAPIKey(keyId: string): Promise<boolean> {
    try {
        const { createServerClient } = await import('@/firebase/server-client');
        const { firestore } = await createServerClient();

        await firestore.collection('api_keys').doc(keyId).update({ active: false });

        logger.info(`[APIKeyManager] Revoked key ${keyId}`);
        return true;
    } catch (err) {
        logger.error(`[APIKeyManager] Failed to revoke key ${keyId}: ${String(err)}`);
        return false;
    }
}

/**
 * List all API keys for an organization (without hashes).
 */
export async function listAPIKeys(orgId: string): Promise<APIKeyRecord[]> {
    const { createServerClient } = await import('@/firebase/server-client');
    const { firestore } = await createServerClient();

    const snap = await firestore
        .collection('api_keys')
        .where('orgId', '==', orgId)
        .get();

    return snap.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            orgId: data.orgId,
            keyHash: '***', // Never expose hash
            keyPrefix: data.keyPrefix,
            name: data.name,
            permissions: data.permissions,
            rateLimitPerMinute: data.rateLimitPerMinute,
            createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
            lastUsedAt: data.lastUsedAt?.toDate?.() ?? undefined,
            expiresAt: data.expiresAt?.toDate?.() ?? undefined,
            active: data.active,
        };
    });
}

/**
 * Check if a key has a specific permission.
 */
export function hasPermission(record: APIKeyRecord, permission: APIPermission): boolean {
    return record.permissions.includes(permission);
}
