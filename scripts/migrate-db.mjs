#!/usr/bin/env node

/**
 * Database Migration CLI
 * Command-line tool for managing Firestore migrations
 * 
 * Usage:
 *   npm run migrate              # Apply all pending migrations
 *   npm run migrate:status       # Show migration status
 *   npm run migrate:rollback -- --id=001_add_user_roles  # Rollback specific migration
 */

import { getMigrationManager } from '../src/firebase/migrations/migration-manager.js';
import { migrations } from '../src/firebase/migrations/migrations.js';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
    dryRun: args.includes('--dry-run'),
    rollback: args.includes('--rollback'),
    status: args.includes('--status'),
    help: args.includes('--help') || args.includes('-h'),
    id: args.find(arg => arg.startsWith('--id='))?.split('=')[1],
    target: parseInt(args.find(arg => arg.startsWith('--target='))?.split('=')[1] || '0'),
};

/**
 * Display help
 */
function showHelp() {
    console.log(`
🔄 Firestore Migration Tool

USAGE:
  npm run migrate [options]

OPTIONS:
  --status                Show current migration status
  --dry-run               Preview what would be migrated
  --target=N              Migrate up to version N
  --rollback --id=ID      Rollback specific migration
  --help, -h              Show this help

EXAMPLES:
  # Show status
  npm run migrate:status

  # Apply all pending migrations
  npm run migrate

  # Preview migrations (dry run)
  npm run migrate -- --dry-run

  # Migrate to specific version
  npm run migrate -- --target=2

  # Rollback a migration
  npm run migrate:rollback -- --id=001_add_user_roles

  # Dry-run rollback
  npm run migrate:rollback -- --id=001_add_user_roles --dry-run

MIGRATION FILES:
  Migrations are defined in src/firebase/migrations/migrations.ts
  
  Each migration must:
  - Have a unique ID
  - Have a sequential version number
  - Implement up() and down() methods
  - Be idempotent (safe to run multiple times)

SAFETY:
  - Always test in development first
  - Use --dry-run to preview changes
  - Backup database before major migrations
  - Migrations are applied sequentially
  - Process stops on first failure
`);
}

/**
 * Show migration status
 */
async function showStatus() {
    console.log('📊 Migration Status\n');
    console.log('='.repeat(60));

    const manager = getMigrationManager(migrations);
    const status = await manager.getStatus();

    console.log(`\nCurrent Version: ${status.current !== null ? status.current : 'No migrations applied'}`);
    console.log(`Pending Migrations: ${status.pending}\n`);

    if (status.completed.length > 0) {
        console.log('✅ Completed Migrations:');
        for (const migration of status.completed) {
            console.log(`   v${migration.version}: ${migration.id} - ${migration.description}`);
        }
        console.log('');
    }

    if (status.pendingMigrations.length > 0) {
        console.log('⏳ Pending Migrations:');
        for (const migration of status.pendingMigrations) {
            console.log(`   v${migration.version}: ${migration.id} - ${migration.description}`);
        }
        console.log('');
    }

    console.log('='.repeat(60));
}

/**
 * Run migrations
 */
async function runMigrations() {
    console.log('🔄 Running Migrations\n');
    console.log('='.repeat(60));

    if (flags.dryRun) {
        console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    const manager = getMigrationManager(migrations);
    const result = await manager.migrate({
        dryRun: flags.dryRun,
        target: flags.target > 0 ? flags.target : undefined,
    });

    console.log('');
    console.log('='.repeat(60));
    console.log(`\n✅ Applied: ${result.applied}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⏭️  Skipped: ${result.skipped}\n`);

    if (result.failed === 0) {
        console.log('✨ All migrations completed successfully!\n');
        return true;
    } else {
        console.log('⚠️  Some migrations failed. Check logs for details.\n');
        return false;
    }
}

/**
 * Rollback migration
 */
async function rollbackMigration() {
    if (!flags.id) {
        console.error('❌ Error: --id required for rollback');
        console.log('   Example: npm run migrate:rollback -- --id=001_add_user_roles\n');
        return false;
    }

    console.log(`🔙 Rolling Back Migration: ${flags.id}\n`);
    console.log('='.repeat(60));

    if (flags.dryRun) {
        console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    const manager = getMigrationManager(migrations);
    const success = await manager.rollback(flags.id, flags.dryRun);

    console.log('');
    console.log('='.repeat(60));

    if (success) {
        console.log('\n✅ Rollback completed successfully!\n');
        return true;
    } else {
        console.log('\n❌ Rollback failed. Check logs for details.\n');
        return false;
    }
}

/**
 * Main execution
 */
async function main() {
    if (flags.help) {
        showHelp();
        process.exit(0);
    }

    try {
        if (flags.status) {
            await showStatus();
            process.exit(0);
        } else if (flags.rollback) {
            const success = await rollbackMigration();
            process.exit(success ? 0 : 1);
        } else {
            const success = await runMigrations();
            process.exit(success ? 0 : 1);
        }
    } catch (error) {
        console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
        console.error('\nStack trace:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
