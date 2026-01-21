/**
 * BakedBot AI in Chrome - Permission Guard
 *
 * Enforces site-level permissions and action confirmations.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import crypto from 'crypto';
import type {
  SitePermission,
  PermissionGrant,
  PermissionResult,
  PendingConfirmation,
  HighRiskAction,
  AllowedAction,
  AccessLevel,
} from '@/types/browser-automation';

const PERMISSIONS_COLLECTION = 'site_permissions';
const CONFIRMATIONS_COLLECTION = 'pending_confirmations';
const CONFIRMATION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Domains that are always blocked
const BLOCKED_DOMAINS = [
  'bank',
  'banking',
  'paypal.com',
  'venmo.com',
  'chase.com',
  'wellsfargo.com',
  'bankofamerica.com',
  'capitalone.com',
  'citibank.com',
  // Add more financial/sensitive domains as needed
];

// Actions that always require confirmation
const ALWAYS_CONFIRM_ACTIONS: HighRiskAction[] = [
  'purchase',
  'payment',
  'delete',
];

export class PermissionGuard {
  /**
   * Check if an action is allowed for a domain
   */
  async checkPermission(
    userId: string,
    url: string,
    action: AllowedAction
  ): Promise<PermissionResult> {
    try {
      const domain = this.extractDomain(url);

      // Check blocked domains
      if (this.isBlockedDomain(domain)) {
        return {
          allowed: false,
          reason: `Domain ${domain} is blocked for security reasons`,
        };
      }

      // Get user's permission for this domain
      const permission = await this.getPermissionForDomain(userId, domain);

      // No permission found - require explicit grant
      if (!permission) {
        return {
          allowed: false,
          reason: `No permission granted for ${domain}. Please grant access first.`,
        };
      }

      // Check if permission is expired
      if (permission.expiresAt && permission.expiresAt.toMillis() < Date.now()) {
        await this.revokeAccess(userId, domain);
        return {
          allowed: false,
          reason: `Permission for ${domain} has expired. Please grant access again.`,
        };
      }

      // Check access level
      if (permission.accessLevel === 'blocked') {
        return {
          allowed: false,
          reason: `Access to ${domain} is blocked`,
        };
      }

      if (permission.accessLevel === 'read-only') {
        const readOnlyActions: AllowedAction[] = ['navigate', 'screenshot', 'scroll'];
        if (!readOnlyActions.includes(action)) {
          return {
            allowed: false,
            reason: `${action} is not allowed in read-only mode for ${domain}`,
          };
        }
      }

      // Check if action is in allowed list
      if (!permission.allowedActions.includes(action)) {
        return {
          allowed: false,
          reason: `Action ${action} is not allowed for ${domain}`,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('[PermissionGuard] Check failed', { error, userId, url, action });
      return {
        allowed: false,
        reason: 'Permission check failed',
      };
    }
  }

  /**
   * Check if action requires confirmation and create pending confirmation if so
   */
  async requireConfirmation(
    userId: string,
    action: HighRiskAction,
    domain: string,
    description: string
  ): Promise<string | null> {
    try {
      // Check if this action always requires confirmation
      if (!ALWAYS_CONFIRM_ACTIONS.includes(action)) {
        // Check user's preference for this domain
        const permission = await this.getPermissionForDomain(userId, domain);
        if (permission && !permission.requiresConfirmation.includes(action)) {
          return null; // No confirmation needed
        }
      }

      // Create pending confirmation
      const token = crypto.randomUUID();
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(now.toMillis() + CONFIRMATION_EXPIRY_MS);

      const confirmation = {
        userId,
        action,
        domain,
        description,
        createdAt: now,
        expiresAt,
      };

      await getAdminFirestore().collection(CONFIRMATIONS_COLLECTION).doc(token).set(confirmation);

      logger.info('[PermissionGuard] Created confirmation request', {
        token,
        userId,
        action,
        domain,
      });

      return token;
    } catch (error) {
      logger.error('[PermissionGuard] Failed to create confirmation', { error });
      throw error;
    }
  }

  /**
   * Confirm a pending action
   */
  async confirmAction(token: string): Promise<PermissionResult> {
    try {
      const doc = await getAdminFirestore().collection(CONFIRMATIONS_COLLECTION).doc(token).get();

      if (!doc.exists) {
        return { allowed: false, reason: 'Confirmation not found or expired' };
      }

      const confirmation = doc.data() as PendingConfirmation;

      // Check if expired
      if (confirmation.expiresAt.toMillis() < Date.now()) {
        await doc.ref.delete();
        return { allowed: false, reason: 'Confirmation expired' };
      }

      // Delete the confirmation
      await doc.ref.delete();

      logger.info('[PermissionGuard] Action confirmed', {
        token,
        userId: confirmation.userId,
        action: confirmation.action,
      });

      return { allowed: true };
    } catch (error) {
      logger.error('[PermissionGuard] Confirm failed', { error, token });
      return { allowed: false, reason: 'Failed to confirm action' };
    }
  }

  /**
   * Deny a pending action
   */
  async denyAction(token: string): Promise<void> {
    try {
      await getAdminFirestore().collection(CONFIRMATIONS_COLLECTION).doc(token).delete();
      logger.info('[PermissionGuard] Action denied', { token });
    } catch (error) {
      logger.error('[PermissionGuard] Deny failed', { error, token });
    }
  }

  /**
   * Get pending confirmation by token
   */
  async getPendingConfirmation(token: string): Promise<PendingConfirmation | null> {
    const doc = await getAdminFirestore().collection(CONFIRMATIONS_COLLECTION).doc(token).get();
    if (!doc.exists) return null;

    const data = doc.data() as PendingConfirmation;

    // Check if expired
    if (data.expiresAt.toMillis() < Date.now()) {
      await doc.ref.delete();
      return null;
    }

    return { ...data, token };
  }

  /**
   * Grant site access
   */
  async grantAccess(
    userId: string,
    domain: string,
    grant: PermissionGrant
  ): Promise<SitePermission> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);

      // Check if blocked
      if (this.isBlockedDomain(normalizedDomain)) {
        throw new Error(`Cannot grant access to blocked domain: ${normalizedDomain}`);
      }

      const now = Timestamp.now();
      const expiresAt = grant.expiresInDays
        ? Timestamp.fromMillis(now.toMillis() + grant.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const permission: Omit<SitePermission, 'id'> = {
        userId,
        domain: normalizedDomain,
        accessLevel: grant.accessLevel,
        allowedActions: grant.allowedActions,
        requiresConfirmation: grant.requiresConfirmation || ['purchase', 'publish', 'delete'],
        grantedAt: now,
        expiresAt,
      };

      // Check for existing permission
      const existing = await this.getPermissionForDomain(userId, normalizedDomain);

      if (existing) {
        await getAdminFirestore().collection(PERMISSIONS_COLLECTION).doc(existing.id).update({
          ...permission,
          grantedAt: existing.grantedAt, // Keep original grant date
        });
        logger.info('[PermissionGuard] Updated permission', { userId, domain: normalizedDomain });
        return { id: existing.id, ...permission, grantedAt: existing.grantedAt };
      }

      const docRef = await getAdminFirestore().collection(PERMISSIONS_COLLECTION).add(permission);
      logger.info('[PermissionGuard] Granted access', { userId, domain: normalizedDomain });

      return { id: docRef.id, ...permission };
    } catch (error) {
      logger.error('[PermissionGuard] Grant failed', { error, userId, domain });
      throw error;
    }
  }

  /**
   * Revoke site access
   */
  async revokeAccess(userId: string, domain: string): Promise<void> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const permission = await this.getPermissionForDomain(userId, normalizedDomain);

      if (permission) {
        await getAdminFirestore().collection(PERMISSIONS_COLLECTION).doc(permission.id).delete();
        logger.info('[PermissionGuard] Revoked access', { userId, domain: normalizedDomain });
      }
    } catch (error) {
      logger.error('[PermissionGuard] Revoke failed', { error, userId, domain });
      throw error;
    }
  }

  /**
   * Block a domain
   */
  async blockDomain(userId: string, domain: string): Promise<void> {
    const normalizedDomain = this.normalizeDomain(domain);
    await this.grantAccess(userId, normalizedDomain, {
      accessLevel: 'blocked',
      allowedActions: [],
    });
  }

  /**
   * List all permissions for user
   */
  async listPermissions(userId: string): Promise<SitePermission[]> {
    const snapshot = await getAdminFirestore()
      .collection(PERMISSIONS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('grantedAt', 'desc')
      .get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    } as SitePermission));
  }

  /**
   * Get permission for a specific domain
   */
  async getPermissionForDomain(
    userId: string,
    domain: string
  ): Promise<SitePermission | null> {
    const normalizedDomain = this.normalizeDomain(domain);

    const snapshot = await getAdminFirestore()
      .collection(PERMISSIONS_COLLECTION)
      .where('userId', '==', userId)
      .where('domain', '==', normalizedDomain)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SitePermission;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return this.normalizeDomain(urlObj.hostname);
    } catch {
      return this.normalizeDomain(url);
    }
  }

  /**
   * Normalize domain (remove www., lowercase)
   */
  private normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, '');
  }

  /**
   * Check if domain is blocked
   */
  private isBlockedDomain(domain: string): boolean {
    const normalized = this.normalizeDomain(domain);
    return BLOCKED_DOMAINS.some(blocked => {
      if (blocked.includes('.')) {
        // Exact match for full domains
        return normalized === blocked || normalized.endsWith('.' + blocked);
      }
      // Partial match for keywords
      return normalized.includes(blocked);
    });
  }
}

// Export singleton instance
export const permissionGuard = new PermissionGuard();
