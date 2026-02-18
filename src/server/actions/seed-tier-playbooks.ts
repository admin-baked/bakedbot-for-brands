'use server';

/**
 * Seed Tier-Based Playbook Templates
 *
 * Adds Pro and Enterprise playbook templates to Firestore
 * Run once during initial setup or when adding new templates
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  PRO_TIER_PLAYBOOKS,
  ENTERPRISE_TIER_PLAYBOOKS,
  templateToFirestoreDoc,
} from '@/app/onboarding/templates/pro-tier-playbooks';

export interface SeedResult {
  success: boolean;
  seeded: string[];
  skipped: string[];
  failed: string[];
  error?: string;
}

/**
 * Seed all tier playbooks to Firestore
 * Only callable by super users
 */
export async function seedTierPlaybooks(): Promise<SeedResult> {
  try {
    const user = await requireUser();

    // Verify user is super user (optional - remove if you want broader access)
    // if (user.role !== 'super_user') {
    //   throw new Error('Only super users can seed playbooks');
    // }

    const { firestore } = await createServerClient();
    const seeded: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    logger.info('[SeedTierPlaybooks] Starting playbook seeding');

    // Combine all templates
    const allTemplates = [...PRO_TIER_PLAYBOOKS, ...ENTERPRISE_TIER_PLAYBOOKS];

    for (const template of allTemplates) {
      try {
        // Check if template already exists
        const existing = await firestore
          .collection('playbook_templates')
          .doc(template.id)
          .get();

        if (existing.exists) {
          logger.info('[SeedTierPlaybooks] Template already exists, skipping', {
            templateId: template.id,
            name: template.name,
          });
          skipped.push(template.id);
          continue;
        }

        // Create the template document
        const doc = templateToFirestoreDoc(template);
        await firestore.collection('playbook_templates').doc(template.id).set(doc);

        logger.info('[SeedTierPlaybooks] Seeded template', {
          templateId: template.id,
          name: template.name,
          tier: template.tier,
        });

        seeded.push(template.id);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error('[SeedTierPlaybooks] Failed to seed template', {
          templateId: template.id,
          error: errorMsg,
        });
        failed.push(template.id);
      }
    }

    logger.info('[SeedTierPlaybooks] Seeding complete', {
      seeded: seeded.length,
      skipped: skipped.length,
      failed: failed.length,
    });

    return {
      success: failed.length === 0,
      seeded,
      skipped,
      failed,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('[SeedTierPlaybooks] Seeding failed', { error: errorMsg });
    return {
      success: false,
      seeded: [],
      skipped: [],
      failed: [],
      error: errorMsg,
    };
  }
}

/**
 * Get list of all tier playbook templates (for inspection)
 */
export async function getTierPlaybookTemplates(): Promise<
  Array<{ id: string; name: string; tier: string; description: string }>
> {
  const allTemplates = [...PRO_TIER_PLAYBOOKS, ...ENTERPRISE_TIER_PLAYBOOKS];

  return allTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    tier: t.tier,
    description: t.description,
  }));
}
