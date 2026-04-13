import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { getAdminFirestore } from '../src/firebase/admin';
import { upsertOrgProfile } from '../src/server/services/org-profile';
import { sendHandoff } from '../src/server/intuition/handoff';

dotenv.config({ path: '.env.local' });

const ORG_ID = 'org_thrive_syracuse';

async function persistStrategy() {
    console.log(`[Dashboard] Persisting strategy for ${ORG_ID}...`);

    // 1. Update OrgProfile Operations
    const strategyUpdate = {
        operations: {
            heroProducts: [
                { 
                    id: 'therapy-infused', 
                    name: 'Therapy .5g Infused Preroll', 
                    role: 'acquisition_hook', 
                    priority: 1, 
                    reason: 'Aggressive $9.99 pricing strategy to drive traffic (single-digit win-back).',
                    validUntil: '2026-05-01T00:00:00Z'
                },
                { 
                    id: 'wavy-sour-og', 
                    name: 'Wavy Sour OG 1g', 
                    role: 'value_leader', 
                    priority: 2, 
                    reason: 'Market-leading $6.99 price point for volume and return frequency.',
                    validUntil: '2026-05-01T00:00:00Z'
                }
            ],
            campaignCalendar: [
                {
                    id: 'welcome-back-pilot',
                    name: 'Welcome Back Win-Back (Pilot)',
                    startDate: '2026-04-13',
                    endDate: '2026-04-30',
                    channels: ['email', 'sms'],
                    theme: 'Single-digit pricing hooks + $1.00 Old Pal add-on perk.',
                    targetSegments: ['churned_90d', 'inactive_30d']
                },
                {
                    id: '420-prep',
                    name: '4/20 National Holiday',
                    startDate: '2026-04-18',
                    endDate: '2026-04-21',
                    channels: ['email', 'sms', 'instagram'],
                    theme: 'RESERVED: Penny Pre-roll ($0.01) Inducement Strategy.',
                    targetSegments: ['all_loyal']
                }
            ],
            pricingPolicy: { 
                marginFloorPct: 35, 
                maxDiscountPct: 40,
                strategyNotes: 'Tiered win-back: $9.99 / $6.99 hooks. $1.00 add-on for check-ins. Reserve $0.01 for 4/20 peak.'
            }
        }
    };

    await upsertOrgProfile(ORG_ID, strategyUpdate, 'ai_builder_martez');
    console.log('✅ OrgProfile operations updated.');

    // 2. Emit Handoff Artifact for the Squad
    console.log('[Letta] Emitting Campaign Brief artifact...');
    const artifact = {
        kind: 'campaign_brief' as const,
        fromAgent: 'linus',
        toAgent: 'broadcast' as const,
        orgId: ORG_ID,
        confidence: 0.95,
        payload: {
            campaignName: 'welcome-back-pilot',
            objective: 'foot_traffic_win_back',
            targetSegments: ['churned_90d', 'inactive_30d'],
            channels: ['email', 'sms'],
            heroProducts: ['therapy-infused', 'wavy-sour-og'],
            copy: {
                headline: 'Syracuse Welcome Back',
                body: 'Single-digit pricing hooks ($9.99/$6.99) + $1.00 add-on perk. Reserve $0.01 for 4/20.',
                cta: 'Check in at the door'
            }
        },
        id: `handoff_${Date.now()}`,
        createdAt: new Date().toISOString()
    };

    await sendHandoff(ORG_ID, artifact);
    console.log('✅ Handoff artifact emitted to bus.');
}

persistStrategy().catch(console.error);
