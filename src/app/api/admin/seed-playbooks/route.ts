/**
 * POST /api/admin/seed-playbooks
 * Seed tier-based playbook templates to Firestore
 * Requires CRON_SECRET header for authentication
 */

import { NextResponse } from 'next/server';
import { seedTierPlaybooks } from '@/server/actions/seed-tier-playbooks';

export async function POST(request: Request) {
  try {
    // Verify authentication via CRON_SECRET
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    // Call the server action to seed playbooks
    // Note: We need to call this in a way that works from API routes
    // Since seedTierPlaybooks requires 'use server', we'll use a workaround
    const { getAdminFirestore } = await import('@/firebase/admin');
    const { PRO_TIER_PLAYBOOKS, ENTERPRISE_TIER_PLAYBOOKS, templateToFirestoreDoc } = await import(
      '@/app/onboarding/templates/pro-tier-playbooks'
    );

    const firestore = getAdminFirestore();
    const seeded: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    const allTemplates = [...PRO_TIER_PLAYBOOKS, ...ENTERPRISE_TIER_PLAYBOOKS];

    for (const template of allTemplates) {
      try {
        // Check if template already exists
        const existing = await firestore.collection('playbook_templates').doc(template.id).get();

        if (existing.exists) {
          skipped.push(template.id);
          continue;
        }

        // Create the template document
        const doc = templateToFirestoreDoc(template);
        await firestore.collection('playbook_templates').doc(template.id).set(doc);

        seeded.push(template.id);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        failed.push(`${template.id}: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      seeded,
      skipped,
      failed,
      message: `Seeded ${seeded.length} templates, skipped ${skipped.length}, failed ${failed.length}`,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Seeding failed', details: errorMsg },
      { status: 500 }
    );
  }
}
