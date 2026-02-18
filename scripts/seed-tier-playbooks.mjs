#!/usr/bin/env node

/**
 * Seed Tier-Based Playbook Templates
 *
 * Usage:
 *   node scripts/seed-tier-playbooks.mjs
 *
 * This script adds Pro and Enterprise playbook templates to Firestore.
 * Requires Firebase CLI and Google Cloud credentials configured.
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import playbook templates
// Note: This requires the templates to be compiled to JS
const PRO_TIER_PLAYBOOKS = [
  {
    id: 'pro-daily-competitive-intel',
    name: '📊 Daily Competitive Intel',
    tier: 'pro',
    description: 'Daily summary of competitor menu changes, pricing, and new products.',
  },
  {
    id: 'pro-campaign-analyzer',
    name: '📈 Weekly Campaign Performance',
    tier: 'pro',
    description: 'Automated campaign performance review with ROI analysis.',
  },
  {
    id: 'pro-revenue-optimizer',
    name: '💰 Revenue Optimization Weekly',
    tier: 'pro',
    description: 'Weekly revenue insights with bundle pricing recommendations.',
  },
];

const ENTERPRISE_TIER_PLAYBOOKS = [
  {
    id: 'enterprise-realtime-intel',
    name: '⚡ Real-Time Competitive Intelligence',
    tier: 'enterprise',
    description: 'Hourly competitor monitoring with unlimited tracking.',
  },
  {
    id: 'enterprise-account-summary',
    name: '🏢 Daily Executive Summary',
    tier: 'enterprise',
    description: 'Executive digest across all locations/brands with KPIs.',
  },
  {
    id: 'enterprise-integration-health',
    name: '🔗 Integration Health Monitor',
    tier: 'enterprise',
    description: 'Daily monitoring of API usage and webhook delivery.',
  },
  {
    id: 'enterprise-custom-integrations',
    name: '🔌 Partner Ecosystem Manager',
    tier: 'enterprise',
    description: 'Manage and monitor custom integrations and API activity.',
  },
];

async function seedPlaybooks() {
  try {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';

      admin.initializeApp({
        projectId,
      });
    }

    const db = admin.firestore();
    const allTemplates = [...PRO_TIER_PLAYBOOKS, ...ENTERPRISE_TIER_PLAYBOOKS];

    console.log('\n📦 Starting playbook template seeding...\n');

    let seeded = 0;
    let skipped = 0;
    let failed = 0;

    for (const template of allTemplates) {
      try {
        // Check if exists
        const existing = await db.collection('playbook_templates').doc(template.id).get();

        if (existing.exists) {
          console.log(`⏭️  SKIP: ${template.name} (already exists)`);
          skipped++;
          continue;
        }

        // Create template
        await db.collection('playbook_templates').doc(template.id).set({
          ...template,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        console.log(`✅ SEEDED: ${template.name} [${template.tier}]`);
        seeded++;
      } catch (err) {
        console.error(`❌ FAILED: ${template.name} - ${err.message}`);
        failed++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   Seeded:  ${seeded}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed:  ${failed}`);
    console.log('');

    if (failed === 0) {
      console.log('✨ All templates seeded successfully!\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ${failed} templates failed to seed\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedPlaybooks();
