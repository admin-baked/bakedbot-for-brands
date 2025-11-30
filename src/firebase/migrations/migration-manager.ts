/**
 * Database Migration System for Firestore
 * 
 * Tracks and executes database migrations in order
 * Stores migration history in Firestore
 * Supports rollback and dry-run
 */

import { createServerClient } from './server-client';
import { logger } from '@/lib/logger';

export interface Migration {
    id: string; // Unique migration ID (e.g., "001_add_user_roles")
    version: number; // Sequential version number
    description: string;
    up: (db: FirebaseFirestore.Firestore) => Promise<void>; // Apply migration
    down: (db: FirebaseFirestore.Firestore) => Promise<void>; // Rollback migration
}

export interface MigrationRecord {
    id: string;
    version: number;
    description: string;
    appliedAt: Date;
    appliedBy: string; // Service account or user
    status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
    error?: string;
    duration?: number; // milliseconds
}

const MIGRATIONS_COLLECTION = '_migrations';

/**
 * Migration Manager
 * Handles execution and tracking of database migrations
 */
export class MigrationManager {
    private migrations: Migration[] = [];

    constructor(migrations: Migration[] = []) {
        // Sort migrations by version
        this.migrations = migrations.sort((a, b) => a.version - b.version);

        // Validate migration IDs are unique
        const ids = new Set<string>();
        for (const migration of this.migrations) {
            if (ids.has(migration.id)) {
                throw new Error(`Duplicate migration ID: ${migration.id}`);
            }
            ids.add(migration.id);
        }
    }

    /**
     * Get migrations collection
     */
    private async getMigrationsCollection() {
        const { firestore } = await createServerClient();
        return firestore.collection(MIGRATIONS_COLLECTION);
    }

    /**
     * Get all applied migrations
     */
    async getAppliedMigrations(): Promise<MigrationRecord[]> {
        const collection = await this.getMigrationsCollection();
        const snapshot = await collection
            .where('status', '==', 'completed')
            .orderBy('version', 'asc')
            .get();

        return snapshot.docs.map(doc => ({
            ...doc.data(),
            appliedAt: doc.data().appliedAt.toDate(),
        } as MigrationRecord));
    }

    /**
     * Get pending migrations
     */
    async getPendingMigrations(): Promise<Migration[]> {
        const applied = await this.getAppliedMigrations();
        const appliedIds = new Set(applied.map(m => m.id));

        return this.migrations.filter(m => !appliedIds.has(m.id));
    }

    /**
     * Record migration start
     */
    private async recordMigrationStart(migration: Migration): Promise<void> {
        const collection = await this.getMigrationsCollection();
        const record: Omit<MigrationRecord, 'appliedAt'> & { appliedAt: FirebaseFirestore.FieldValue } = {
            id: migration.id,
            version: migration.version,
            description: migration.description,
            appliedAt: (await import('firebase-admin/firestore')).FieldValue.serverTimestamp(),
            appliedBy: 'migration-script', // Could be enhanced with actual user
            status: 'running',
        };

        await collection.doc(migration.id).set(record);
    }

    /**
     * Record migration completion
     */
    private async recordMigrationComplete(
        migration: Migration,
        duration: number,
        error?: string
    ): Promise<void> {
        const collection = await this.getMigrationsCollection();
        await collection.doc(migration.id).update({
            status: error ? 'failed' : 'completed',
            duration,
            ...(error && { error }),
        });
    }

    /**
     * Apply a single migration
     */
    async applyMigration(migration: Migration, dryRun = false): Promise<boolean> {
        const startTime = Date.now();

        logger.info(`Applying migration: ${migration.id}`, {
            version: migration.version,
            description: migration.description,
            dryRun,
        });

        if (dryRun) {
            logger.info('DRY RUN - Migration not actually applied');
            return true;
        }

        try {
            await this.recordMigrationStart(migration);

            const { firestore } = await createServerClient();
            await migration.up(firestore);

            const duration = Date.now() - startTime;
            await this.recordMigrationComplete(migration, duration);

            logger.info(`Migration completed: ${migration.id}`, { duration });
            return true;
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            await this.recordMigrationComplete(migration, duration, errorMessage);
            logger.error(`Migration failed: ${migration.id}`, { error: errorMessage, duration });

            return false;
        }
    }

    /**
     * Apply all pending migrations
     */
    async migrate(options: { dryRun?: boolean; target?: number } = {}): Promise<{
        applied: number;
        failed: number;
        skipped: number;
    }> {
        const { dryRun = false, target } = options;

        logger.info('Starting migration process', { dryRun, target });

        const pending = await this.getPendingMigrations();

        // Filter by target version if specified
        const toApply = target
            ? pending.filter(m => m.version <= target)
            : pending;

        logger.info(`Found ${toApply.length} pending migrations`);

        let applied = 0;
        let failed = 0;
        let skipped = 0;

        for (const migration of toApply) {
            const success = await this.applyMigration(migration, dryRun);

            if (success) {
                applied++;
            } else {
                failed++;
                logger.error('Migration failed, stopping migration process');
                break; // Stop on first failure
            }
        }

        skipped = toApply.length - applied - failed;

        logger.info('Migration process complete', { applied, failed, skipped });

        return { applied, failed, skipped };
    }

    /**
     * Rollback a migration
     */
    async rollback(migrationId: string, dryRun = false): Promise<boolean> {
        const migration = this.migrations.find(m => m.id === migrationId);

        if (!migration) {
            logger.error(`Migration not found: ${migrationId}`);
            return false;
        }

        logger.info(`Rolling back migration: ${migrationId}`, { dryRun });

        if (dryRun) {
            logger.info('DRY RUN - Rollback not actually executed');
            return true;
        }

        try {
            const { firestore } = await createServerClient();
            await migration.down(firestore);

            const collection = await this.getMigrationsCollection();
            await collection.doc(migrationId).update({
                status: 'rolled_back',
            });

            logger.info(`Migration rolled back: ${migrationId}`);
            return true;
        } catch (error) {
            logger.error(`Rollback failed: ${migrationId}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Get migration status
     */
    async getStatus(): Promise<{
        current: number | null;
        pending: number;
        completed: Migration[];
        pendingMigrations: Migration[];
    }> {
        const applied = await this.getAppliedMigrations();
        const pending = await this.getPendingMigrations();

        const current = applied.length > 0
            ? Math.max(...applied.map(m => m.version))
            : null;

        return {
            current,
            pending: pending.length,
            completed: this.migrations.filter(m =>
                applied.some(a => a.id === m.id)
            ),
            pendingMigrations: pending,
        };
    }
}

/**
 * Create and export migration manager singleton
 */
let migrationManager: MigrationManager | null = null;

export function getMigrationManager(migrations?: Migration[]): MigrationManager {
    if (!migrationManager && migrations) {
        migrationManager = new MigrationManager(migrations);
    } else if (!migrationManager) {
        throw new Error('Migration manager not initialized. Call with migrations first.');
    }
    return migrationManager;
}
