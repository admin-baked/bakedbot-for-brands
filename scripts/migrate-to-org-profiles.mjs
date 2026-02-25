#!/usr/bin/env node
/**
 * migrate-to-org-profiles.mjs
 *
 * Reads legacy brands/{orgId} + org_intent_profiles/{orgId} for each org,
 * merges them into the unified OrgProfile shape, and writes to org_profiles/{orgId}.
 *
 * Runs in DRY-RUN mode by default. Use --apply to write to Firestore.
 *
 * Usage:
 *   node scripts/migrate-to-org-profiles.mjs               # Dry run — see what would be written
 *   node scripts/migrate-to-org-profiles.mjs --apply       # Write org_profiles docs
 *   node scripts/migrate-to-org-profiles.mjs --orgId=xxx   # Migrate a single org
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'studio-567050101-bc6e8';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SINGLE_ORG = args.find((a) => a.startsWith('--orgId='))?.split('=')[1] || null;

// ── Init Firebase Admin ───────────────────────────────────────────────────────

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

function toStrArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  return [];
}

/** Map legacy brands/{orgId} doc to OrgProfileBrand */
function mapBrandData(brandData) {
  if (!brandData) return null;

  const vi = brandData.visualIdentity || {};
  const colors = vi.colors || {};
  const voice = brandData.voice || {};
  const messaging = brandData.messaging || {};
  const compliance = brandData.compliance || {};
  const meta = brandData.metadata || {};

  return {
    name: brandData.brandName || brandData.name || '',
    tagline: messaging.tagline || brandData.tagline || undefined,
    city: meta.city || brandData.city || undefined,
    state: meta.state || brandData.state || compliance.state || undefined,
    dispensaryType: meta.dispensaryType || brandData.dispensaryType || undefined,
    instagramHandle: brandData.socialHandles?.instagram || brandData.instagramHandle || undefined,
    facebookHandle: brandData.socialHandles?.facebook || brandData.facebookHandle || undefined,
    websiteUrl: brandData.websiteUrl || meta.websiteUrl || undefined,
    visualIdentity: {
      colors: {
        primary: colors.primary || { hex: '#4ade80', name: 'Primary', usage: 'Main brand color' },
        secondary: colors.secondary || undefined,
        accent: colors.accent || undefined,
      },
      logo: vi.logo ? { primary: vi.logo.primary || vi.logo } : undefined,
    },
    voice: {
      tone: toStrArr(voice.tone),
      personality: toStrArr(voice.personality),
      doWrite: toStrArr(voice.doWrite),
      dontWrite: toStrArr(voice.dontWrite),
    },
    messaging: {
      tagline: messaging.tagline || undefined,
      positioning: messaging.positioning || undefined,
      mission: messaging.missionStatement || messaging.mission || undefined,
      keyMessages: toStrArr(messaging.keyMessages),
      valuePropositions: toStrArr(messaging.valuePropositions),
    },
    compliance: {
      state: meta.state || compliance.state || undefined,
      ageDisclaimer: compliance.ageDisclaimer || undefined,
      medicalClaimsGuidance: compliance.medicalClaimsGuidance || undefined,
      restrictions: toStrArr(compliance.restrictions),
    },
  };
}

/** Default intent for orgs that have no intent profile */
function defaultIntent() {
  return {
    strategicFoundation: {
      archetype: 'community_hub',
      growthStage: 'growth',
      competitivePosture: 'differentiator',
      geographicStrategy: 'regional',
      weightedObjectives: [],
    },
    valueHierarchies: {
      speedVsEducation: 0.5,
      volumeVsMargin: 0.5,
      acquisitionVsRetention: 0.5,
      complianceConservatism: 0.5,
      automationVsHumanTouch: 0.5,
      brandVoiceFormality: 0.5,
    },
    agentConfigs: {
      smokey: {
        recommendationPhilosophy: 'effect_first',
        upsellAggressiveness: 0.5,
        newUserProtocol: 'guided',
        productEducationDepth: 'moderate',
      },
      craig: {
        campaignFrequencyCap: 2,
        preferredChannels: ['sms', 'email'],
        toneArchetype: 'sage',
        promotionStrategy: 'value_led',
      },
    },
    hardBoundaries: { neverDoList: [], escalationTriggers: [] },
    feedbackConfig: {
      captureNegativeFeedback: true,
      requestExplicitFeedback: false,
      minimumInteractionsForAdjustment: 5,
    },
  };
}

/** Map legacy org_intent_profiles/{orgId} to OrgProfileIntent */
function mapIntentData(intentData) {
  if (!intentData) return defaultIntent();
  return {
    strategicFoundation: intentData.strategicFoundation || defaultIntent().strategicFoundation,
    valueHierarchies: intentData.valueHierarchies || defaultIntent().valueHierarchies,
    agentConfigs: intentData.agentConfigs || defaultIntent().agentConfigs,
    hardBoundaries: intentData.hardBoundaries || { neverDoList: [], escalationTriggers: [] },
    feedbackConfig: intentData.feedbackConfig || defaultIntent().feedbackConfig,
  };
}

/** Calculate a simple completion score for logging */
function calcCompletion(brand, intent) {
  let score = 0;
  if (brand?.name) score += 10;
  if (brand?.voice?.tone?.length && brand.voice.personality?.length) score += 15;
  if (brand?.visualIdentity?.colors?.primary?.hex) score += 15;
  const sf = intent?.strategicFoundation;
  if (sf?.archetype) score += 10; // partial — no weighted objectives
  return score;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function getOrgIds() {
  if (SINGLE_ORG) return [SINGLE_ORG];

  // Collect all org IDs from both source collections
  const orgIds = new Set();

  const brandsSnap = await db.collection('brands').listDocuments();
  brandsSnap.forEach((ref) => orgIds.add(ref.id));

  const intentSnap = await db.collection('org_intent_profiles').listDocuments();
  intentSnap.forEach((ref) => orgIds.add(ref.id));

  return Array.from(orgIds).sort();
}

async function migrateOrg(orgId) {
  const [brandDoc, intentDoc, existingDoc] = await Promise.all([
    db.collection('brands').doc(orgId).get(),
    db.collection('org_intent_profiles').doc(orgId).get(),
    db.collection('org_profiles').doc(orgId).get(),
  ]);

  const brandData = brandDoc.exists ? brandDoc.data() : null;
  const intentData = intentDoc.exists ? intentDoc.data() : null;

  if (!brandData && !intentData) {
    console.log(`  [SKIP] ${orgId} — no legacy data found`);
    return { status: 'skip', orgId };
  }

  if (existingDoc.exists) {
    const existing = existingDoc.data();
    if (!existing?.isDefault) {
      console.log(`  [SKIP] ${orgId} — org_profiles doc already exists and is not default`);
      return { status: 'skip_exists', orgId };
    }
    console.log(`  [OVERWRITE] ${orgId} — existing doc is a default, will overwrite`);
  }

  const brand = mapBrandData(brandData);
  const intent = mapIntentData(intentData);

  const completionPct = calcCompletion(brand, intent);

  const orgProfile = {
    id: orgId,
    orgId,
    version: '1.0.0',
    isDefault: !intentData, // true if we had no real intent profile
    completionPct,
    lastModifiedBy: 'migration_script',
    createdAt: now(),
    updatedAt: now(),
    brand,
    intent,
  };

  // Strip undefined values (Firestore doesn't accept them)
  const clean = JSON.parse(JSON.stringify(orgProfile));

  if (!APPLY) {
    console.log(`  [DRY-RUN] ${orgId} → org_profiles/${orgId} (completion: ${completionPct}%)`);
    console.log(`    brand.name: "${brand?.name || '(empty)'}", intent.archetype: "${intent.strategicFoundation.archetype}"`);
    return { status: 'dry_run', orgId, completionPct };
  }

  await db.collection('org_profiles').doc(orgId).set(clean, { merge: false });

  // Write history entry
  const historyId = now();
  await db.collection('org_profiles').doc(orgId).collection('history').doc(historyId).set({
    versionId: historyId,
    savedBy: 'migration_script',
    savedAt: historyId,
    changeNote: 'Migrated from brands/ + org_intent_profiles/ collections',
    snapshot: clean,
  });

  console.log(`  [WROTE] ${orgId} → org_profiles/${orgId} (completion: ${completionPct}%)`);
  return { status: 'written', orgId, completionPct };
}

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  OrgProfile Migration Script');
  console.log(`  Mode: ${APPLY ? '🔴 APPLY (writing to Firestore)' : '🟡 DRY-RUN (read-only)'}`);
  if (SINGLE_ORG) console.log(`  Target: ${SINGLE_ORG}`);
  console.log('════════════════════════════════════════════════════════════\n');

  const orgIds = await getOrgIds();
  console.log(`Found ${orgIds.length} org(s) to process.\n`);

  const results = { written: 0, dry_run: 0, skip: 0, skip_exists: 0, error: 0 };

  for (const orgId of orgIds) {
    try {
      const result = await migrateOrg(orgId);
      results[result.status] = (results[result.status] || 0) + 1;
    } catch (err) {
      console.error(`  [ERROR] ${orgId}: ${err.message}`);
      results.error++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  Migration Summary');
  console.log('════════════════════════════════════════════════════════════');
  if (APPLY) {
    console.log(`  Written:      ${results.written}`);
  } else {
    console.log(`  Would write:  ${results.dry_run}`);
    console.log('\n  Run with --apply to write to Firestore.');
  }
  console.log(`  Skipped:      ${results.skip + results.skip_exists}`);
  console.log(`  Errors:       ${results.error}`);
  console.log('');

  process.exit(results.error > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
