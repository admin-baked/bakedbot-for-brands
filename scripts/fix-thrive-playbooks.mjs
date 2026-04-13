/**
 * Fix Thrive Syracuse Playbooks
 * 
 * 1. Seeds missing playbook definitions in 'playbooks' collection
 * 2. Registers event listeners for org_thrive_syracuse
 * 3. Ensures 'welcome-sequence' is fully defined
 */

import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach((line) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const eqIdx = line.indexOf('=');
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const ORG_ID = 'org_thrive_syracuse';

const EMPIRE_PLAYBOOKS = [
  'welcome-sequence', 'owner-quickstart-guide', 'menu-health-scan', 'white-glove-onboarding',
  'post-purchase-thank-you', 'birthday-loyalty-reminder', 'win-back-sequence', 'new-product-launch',
  'vip-customer-identification', 'pro-competitive-brief', 'daily-competitive-intel', 'real-time-price-alerts',
  'weekly-compliance-digest', 'pre-send-campaign-check', 'jurisdiction-change-alert', 'audit-prep-automation',
  'weekly-performance-snapshot', 'campaign-roi-report', 'executive-daily-digest', 'multi-location-rollup',
  'seasonal-template-pack', 'usage-alert',
];

async function initializeFirebase() {
  if (getApps().length > 0) return getApps()[0];

  const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY required');

  const serviceAccount = JSON.parse(Buffer.from(encodedKey, 'base64').toString('utf-8'));
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: 'studio-567050101-bc6e8',
  });
}

async function run() {
  const app = await initializeFirebase();
  const db = getFirestore(app);

  console.log('🚀 Starting Thrive Playbook Fix');

  // 1. Seed Global Definitions
  const batch = db.batch();
  for (const id of EMPIRE_PLAYBOOKS) {
    const ref = db.collection('playbooks').doc(id);
    
    let playbookData = {
        id,
        orgId: 'system', // Global blueprints
        active: true,
        status: 'active',
        name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: `Automated enterprise playbook: ${id}`,
        category: 'marketing',
        agent: 'mrs_parker',
        triggers: [],
        steps: [
            {
                id: 'notify_placeholder',
                type: 'notify',
                name: 'System Notification',
                config: {
                    channels: ['dashboard'],
                    message: `Playbook ${id} triggered for {{customerName}}`,
                }
            }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
    };

    // Specific logic for welcome-sequence
    if (id === 'welcome-sequence') {
        playbookData.triggers = [
            { type: 'event', eventName: 'customer.signup', enabled: true },
            { type: 'event', eventName: 'customer.created', enabled: true }
        ];
        playbookData.steps = [
            {
                id: 'welcome_email',
                type: 'send_email',
                name: 'Welcome Email',
                agent: 'mrs_parker',
                delay: 0,
                config: {
                    emailType: 'welcome',
                    aiGenerated: true,
                    personalizationLevel: 'deep',
                }
            },
            {
                id: 'day3_followup',
                type: 'send_email',
                name: 'Day 3: Check-in',
                agent: 'smokey',
                delay: 259200000,
                config: {
                    emailType: 'nurture',
                    subject: 'How was your first visit? 🌿',
                    aiGenerated: true,
                }
            }
        ];
    }

    // Specific logic for birthday-loyalty-reminder
    if (id === 'birthday-loyalty-reminder') {
        playbookData.triggers = [{ type: 'schedule', cron: '0 8 * * *', enabled: true }];
        playbookData.agent = 'mrs_parker';
    }

    batch.set(ref, playbookData, { merge: true });
  }

  await batch.commit();
  console.log(`✅ Seeded ${EMPIRE_PLAYBOOKS.length} playbook definitions`);

  // 2. Register Listeners for Thrive Syracuse
  const listenerBatch = db.batch();
  const listenersRef = db.collection('playbook_event_listeners');
  
  // Register welcome-sequence listeners
  const welcomeListeners = ['customer.signup', 'customer.created'];
  for (const eventName of welcomeListeners) {
    const docId = `listener:welcome-sequence:${eventName}:${ORG_ID}`;
    listenerBatch.set(listenersRef.doc(docId), {
        playbookId: 'welcome-sequence',
        orgId: ORG_ID,
        eventName,
        status: 'active',
        createdAt: admin.firestore.Timestamp.now(),
    });
  }

  await listenerBatch.commit();
  console.log(`✅ Registered ${welcomeListeners.length} event listeners for ${ORG_ID}`);

  // 3. Cleanup: Ensure any existing assignments are active
  const assignmentsSnap = await db.collection('playbook_assignments')
    .where('orgId', '==', ORG_ID)
    .get();

  const updateBatch = db.batch();
  assignmentsSnap.forEach(doc => {
    updateBatch.update(doc.ref, { status: 'active', updatedAt: admin.firestore.Timestamp.now() });
  });

  if (assignmentsSnap.size > 0) {
    await updateBatch.commit();
    console.log(`✅ Activated ${assignmentsSnap.size} playbook assignments for ${ORG_ID}`);
  }

  console.log('\n✨ All tasks complete. System is ready for Thrive check-ins.');
}

run().catch(console.error);
