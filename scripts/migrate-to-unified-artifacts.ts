#!/usr/bin/env tsx

/**
 * Migration Script: Legacy Collections → Unified Artifacts
 *
 * Migrates data from separate collections to unified artifacts collection:
 * - carousels → artifacts (type: carousel)
 * - bundles → artifacts (type: bundle)
 * - creative_content → artifacts (type: creative_content)
 *
 * Usage:
 *   npm run migrate:artifacts              # Dry run (preview only)
 *   npm run migrate:artifacts --execute    # Actually migrate
 *   npm run migrate:artifacts --collection carousels --execute  # Migrate specific collection
 */

import { db } from '../src/lib/firebase-admin';
import type { UnifiedArtifact, UnifiedArtifactType, ArtifactRole } from '../src/types/unified-artifact';
import { FieldValue } from '@google-cloud/firestore';

// CLI arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--execute');
const targetCollection = args.find(arg => !arg.startsWith('--')) || 'all';

// Legacy collection definitions
const LEGACY_COLLECTIONS = {
  carousels: {
    artifactType: 'carousel' as UnifiedArtifactType,
    defaultRole: 'brand' as ArtifactRole,
    defaultAgent: 'smokey' as const,
  },
  bundles: {
    artifactType: 'bundle' as UnifiedArtifactType,
    defaultRole: 'brand' as ArtifactRole,
    defaultAgent: 'money_mike' as const,
  },
  creative_content: {
    artifactType: 'creative_content' as UnifiedArtifactType,
    defaultRole: 'brand' as ArtifactRole,
    defaultAgent: 'craig' as const,
  },
};

const ARTIFACTS_COLLECTION = 'artifacts';

// Statistics
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
};

// ============================================================================
// Main Migration Function
// ============================================================================

async function migrate() {
  console.log('\n🚀 Unified Artifacts Migration');
  console.log('================================\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No data will be modified\n');
  } else {
    console.log('⚠️  EXECUTE MODE - Data will be migrated\n');
  }

  // Get collections to migrate
  const collectionsToMigrate =
    targetCollection === 'all'
      ? Object.keys(LEGACY_COLLECTIONS)
      : [targetCollection];

  console.log(`Collections to migrate: ${collectionsToMigrate.join(', ')}\n`);

  // Migrate each collection
  for (const collectionName of collectionsToMigrate) {
    if (!(collectionName in LEGACY_COLLECTIONS)) {
      console.error(`❌ Unknown collection: ${collectionName}`);
      continue;
    }

    await migrateCollection(
      collectionName as keyof typeof LEGACY_COLLECTIONS
    );
  }

  // Print summary
  console.log('\n================================');
  console.log('📊 Migration Summary');
  console.log('================================');
  console.log(`Total documents:  ${stats.total}`);
  console.log(`Migrated:         ${stats.migrated}`);
  console.log(`Skipped:          ${stats.skipped}`);
  console.log(`Errors:           ${stats.errors}`);
  console.log('================================\n');

  if (isDryRun) {
    console.log('✅ Dry run complete. Run with --execute to apply changes.\n');
  } else {
    console.log('✅ Migration complete!\n');
  }
}

// ============================================================================
// Migrate Single Collection
// ============================================================================

async function migrateCollection(
  collectionName: keyof typeof LEGACY_COLLECTIONS
) {
  console.log(`\n📦 Processing: ${collectionName}`);
  console.log('----------------------------');

  const config = LEGACY_COLLECTIONS[collectionName];
  const legacyCollection = db.collection(collectionName);

  // Get all documents
  const snapshot = await legacyCollection.get();

  console.log(`Found ${snapshot.size} documents\n`);

  for (const doc of snapshot.docs) {
    stats.total++;

    try {
      const legacyData = doc.data();

      // Check if already migrated
      const existingArtifact = await db
        .collection(ARTIFACTS_COLLECTION)
        .where('legacyId', '==', doc.id)
        .where('legacyCollection', '==', collectionName)
        .limit(1)
        .get();

      if (!existingArtifact.empty) {
        console.log(`⏭️  Skipped: ${doc.id} (already migrated)`);
        stats.skipped++;
        continue;
      }

      // Transform to unified artifact
      const artifact = transformLegacyDocument(
        doc.id,
        legacyData,
        collectionName,
        config
      );

      // Validate required fields
      if (!artifact.orgId || !artifact.userId) {
        console.log(`⚠️  Skipped: ${doc.id} (missing orgId or userId)`);
        stats.skipped++;
        continue;
      }

      if (!isDryRun) {
        // Create in artifacts collection
        const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc();
        artifact.id = artifactRef.id;
        await artifactRef.set(artifact);

        // Mark legacy document as migrated (add flag)
        await legacyCollection.doc(doc.id).update({
          _migrated: true,
          _migratedTo: artifactRef.id,
          _migratedAt: FieldValue.serverTimestamp(),
        });

        console.log(`✅ Migrated: ${doc.id} → ${artifactRef.id}`);
      } else {
        console.log(`✅ Would migrate: ${doc.id}`);
      }

      stats.migrated++;
    } catch (error) {
      console.error(`❌ Error migrating ${doc.id}:`, error);
      stats.errors++;
    }
  }
}

// ============================================================================
// Transform Legacy Document
// ============================================================================

function transformLegacyDocument(
  legacyId: string,
  legacyData: any,
  collectionName: keyof typeof LEGACY_COLLECTIONS,
  config: typeof LEGACY_COLLECTIONS[keyof typeof LEGACY_COLLECTIONS]
): Omit<UnifiedArtifact, 'id'> {
  const now = Date.now();

  // Base artifact structure
  const artifact: Omit<UnifiedArtifact, 'id'> = {
    type: config.artifactType,
    role: config.defaultRole,
    orgId: legacyData.orgId || legacyData.tenantId || '',
    userId: legacyData.userId || legacyData.createdBy || '',
    brandId: legacyData.brandId,
    title: extractTitle(legacyData, collectionName),
    description: legacyData.description,
    data: transformData(legacyData, collectionName),
    status: determineStatus(legacyData),
    createdBy: config.defaultAgent,
    rationale: 'Migrated from legacy system',
    legacyId: legacyId,
    legacyCollection: collectionName,
    migratedAt: now,
    createdAt: legacyData.createdAt?.toMillis?.() || legacyData.createdAt || now,
    updatedAt: legacyData.updatedAt?.toMillis?.() || legacyData.updatedAt || now,
    version: 1,
    tags: legacyData.tags || [],
    searchTerms: [],
  };

  // Add optional timestamps if they exist
  if (legacyData.publishedAt) {
    artifact.publishedAt = legacyData.publishedAt?.toMillis?.() || legacyData.publishedAt;
    artifact.publishedBy = legacyData.publishedBy || artifact.userId;
  }

  if (legacyData.approvedAt) {
    artifact.approvedAt = legacyData.approvedAt?.toMillis?.() || legacyData.approvedAt;
    artifact.approvedBy = legacyData.approvedBy || artifact.userId;
  }

  return artifact;
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractTitle(data: any, collection: string): string {
  switch (collection) {
    case 'carousels':
      return data.title || data.name || 'Unnamed Carousel';
    case 'bundles':
      return data.name || data.title || 'Unnamed Bundle';
    case 'creative_content':
      return data.title || `${data.platform || 'Social'} Post` || 'Unnamed Post';
    default:
      return 'Untitled';
  }
}

function transformData(data: any, collection: string): any {
  switch (collection) {
    case 'carousels':
      return {
        title: data.title || '',
        description: data.description,
        products: data.products || [],
        displayOrder: data.displayOrder || 0,
        autoRotate: data.autoRotate ?? true,
        rotationInterval: data.rotationInterval || 5000,
        style: data.style || 'hero',
      };

    case 'bundles':
      return {
        name: data.name || '',
        description: data.description || '',
        type: data.type || 'percentage',
        products: data.products || [],
        discount: data.discount,
        minimumPurchase: data.minimumPurchase,
        maximumPurchase: data.maximumPurchase,
        validFrom: data.validFrom,
        validTo: data.validTo,
        marginAnalysis: data.marginAnalysis,
      };

    case 'creative_content':
      return {
        platform: data.platform || 'instagram',
        caption: data.caption || '',
        hashtags: data.hashtags || [],
        mediaUrls: data.mediaUrls || [],
        thumbnailUrl: data.thumbnailUrl,
        style: data.style,
        targetAudience: data.targetAudience,
        complianceStatus: data.complianceStatus || 'active',
        complianceNotes: data.complianceNotes,
        scheduledAt: data.scheduledAt,
      };

    default:
      return data;
  }
}

function determineStatus(data: any): UnifiedArtifact['status'] {
  // Try to infer status from legacy data
  if (data.status === 'published' || data.publishedAt) {
    return 'published';
  }
  if (data.status === 'approved' || data.approvedAt) {
    return 'approved';
  }
  if (data.status === 'pending' || data.status === 'pending_review') {
    return 'pending_review';
  }
  if (data.status === 'rejected') {
    return 'rejected';
  }
  if (data.status === 'archived') {
    return 'archived';
  }
  // Default to published if it has publishedAt, otherwise draft
  return data.publishedAt ? 'published' : 'draft';
}

// ============================================================================
// Run Migration
// ============================================================================

migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
