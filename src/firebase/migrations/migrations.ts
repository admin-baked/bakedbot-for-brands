/**
 * Example migrations
 * 
 * Each migration should:
 * - Have a unique ID
 * - Have a sequential version number
 * - Implement both up() and down() methods
 * - Be idempotent (safe to run multiple times)
 * - Handle errors gracefully
 */

import type { Migration } from './migration-manager';
import { logger } from '@/lib/logger';

/**
 * Migration 001: Add user roles field
 * Adds a 'roles' array field to all user documents
 */
export const migration001: Migration = {
    id: '001_add_user_roles',
    version: 1,
    description: 'Add roles field to user documents',

    async up(db) {
        logger.info('Running migration 001: Add user roles');

        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        const batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            // Only update if roles field doesn't exist
            if (!doc.data().roles) {
                batch.update(doc.ref, {
                    roles: ['user'], // Default role
                    updatedAt: new Date(),
                });
                count++;
            }
        }

        if (count > 0) {
            await batch.commit();
            logger.info(`Updated ${count} user documents with roles field`);
        } else {
            logger.info('No users needed updating');
        }
    },

    async down(db) {
        logger.info('Rolling back migration 001: Remove user roles');

        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        const batch = db.batch();

        for (const doc of snapshot.docs) {
            batch.update(doc.ref, {
                roles: (await import('firebase-admin/firestore')).FieldValue.delete(),
            });
        }

        await batch.commit();
        logger.info('Removed roles field from all users');
    },
};

/**
 * Migration 002: Add order status index
 * Adds createdAt timestamp to orders for better querying
 */
export const migration002: Migration = {
    id: '002_add_order_timestamps',
    version: 2,
    description: 'Add createdAt timestamp to orders',

    async up(db) {
        logger.info('Running migration 002: Add order timestamps');

        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.get();

        const batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Add createdAt if it doesn't exist
            if (!data.createdAt) {
                batch.update(doc.ref, {
                    createdAt: data.updatedAt || new Date(), // Use updatedAt as fallback
                });
                count++;
            }
        }

        if (count > 0) {
            await batch.commit();
            logger.info(`Updated ${count} orders with createdAt timestamp`);
        }
    },

    async down(db) {
        logger.info('Rolling back migration 002: Remove order timestamps');

        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.get();

        const batch = db.batch();

        for (const doc of snapshot.docs) {
            batch.update(doc.ref, {
                createdAt: (await import('firebase-admin/firestore')).FieldValue.delete(),
            });
        }

        await batch.commit();
        logger.info('Removed createdAt from all orders');
    },
};

/**
 * Migration 003: Normalize phone numbers
 * Ensures all phone numbers are in E.164 format
 */
export const migration003: Migration = {
    id: '003_normalize_phone_numbers',
    version: 3,
    description: 'Normalize phone numbers to E.164 format',

    async up(db) {
        logger.info('Running migration 003: Normalize phone numbers');

        // Helper function to normalize phone
        const normalizePhone = (phone: string): string => {
            // Remove all non-digits
            const digits = phone.replace(/\D/g, '');

            // Add +1 if US number without country code
            if (digits.length === 10) {
                return `+1${digits}`;
            }

            // Add + if missing
            if (!phone.startsWith('+')) {
                return `+${digits}`;
            }

            return `+${digits}`;
        };

        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '!=', null).get();

        const batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const phone = doc.data().phone;

            if (phone && !phone.startsWith('+')) {
                const normalized = normalizePhone(phone);
                batch.update(doc.ref, { phone: normalized });
                count++;
            }
        }

        if (count > 0) {
            await batch.commit();
            logger.info(`Normalized ${count} phone numbers`);
        }
    },

    async down(db) {
        logger.info('Rolling back migration 003: Phone normalization');
        logger.warn('Cannot reliably rollback phone number changes');
        // Rollback not feasible without storing original values
    },
};

/**
 * Export all migrations in order
 */
export const migrations: Migration[] = [
    migration001,
    migration002,
    migration003,
    // Add new migrations here
];
