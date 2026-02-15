/**
 * Seed Super User Ground Truth to Firestore
 *
 * Loads BakedBot competitive context into ground_truth_v2/super_user collection
 *
 * Run with: npx tsx scripts/seed-super-user-ground-truth.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { BAKEDBOT_COMPETITIVE_CONTEXT, SUPER_USER_PRESET_PROMPTS } from '../src/server/grounding/super-user/bakedbot-competitive-context';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

const logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
};

async function main() {
    logger.info('[Seed] Starting Super User ground truth import...');

    try {
        const batch = firestore.batch();
        let count = 0;

        // 1. Load competitive context (Q&A pairs)
        for (const item of BAKEDBOT_COMPETITIVE_CONTEXT) {
            const docId = `qa_${item.category}_${count}`;
            const docRef = firestore
                .collection('ground_truth_v2')
                .doc('super_user')
                .collection('knowledge')
                .doc(docId);

            batch.set(docRef, {
                question: item.question,
                answer: item.answer,
                category: item.category,
                tags: item.tags || [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            count++;
        }

        logger.info('[Seed] Prepared ground truth entries:', { count });

        // 2. Load preset prompts
        const promptsRef = firestore
            .collection('ground_truth_v2')
            .doc('super_user')
            .collection('quick_actions')
            .doc('default');

        batch.set(promptsRef, {
            prompts: SUPER_USER_PRESET_PROMPTS,
            updatedAt: new Date(),
        });

        logger.info('[Seed] Prepared preset prompts:', { count: SUPER_USER_PRESET_PROMPTS.length });

        // 3. Create role metadata
        const metadataRef = firestore
            .collection('ground_truth_v2')
            .doc('super_user');

        batch.set(metadataRef, {
            role: 'super_user',
            description: 'BakedBot Super User - Company growth and customer management',
            focusAreas: [
                'Competitive intelligence (AlpineIQ, Dutchie, agencies)',
                'Customer management and retention',
                'Revenue growth toward $100k MRR',
                'Product strategy and development',
                'Agent orchestration and automation',
            ],
            totalKnowledgeItems: count,
            quickActionsCount: SUPER_USER_PRESET_PROMPTS.length,
            lastUpdated: new Date(),
        }, { merge: true });

        // Commit batch
        await batch.commit();

        console.log('\n' + '='.repeat(70));
        console.log('✅ SUPER USER GROUND TRUTH SEEDED');
        console.log('='.repeat(70));
        console.log(`\nKnowledge Entries: ${count}`);
        console.log(`Quick Actions: ${SUPER_USER_PRESET_PROMPTS.length}`);
        console.log('\nCategories Loaded:');
        console.log('  - Company Overview (business model, revenue targets)');
        console.log('  - Competitors (software + agencies)');
        console.log('  - Competitive Positioning (differentiation)');
        console.log('  - Growth Strategy (GTM, metrics, pricing)');
        console.log('  - Product Strategy (agents, integrations)');
        console.log('  - Customer Management (retention, KPIs)');
        console.log('  - Super User Capabilities (tools, workflows)');
        console.log('\nNext Steps:');
        console.log('  1. Verify in Firestore: ground_truth_v2/super_user/knowledge');
        console.log('  2. Test quick actions in CEO Dashboard');
        console.log('  3. Run agent with super_user context');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        logger.error('[Seed] Failed to seed ground truth:', { error });
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

main().catch(console.error);
