/**
 * Thrive Syracuse 4/20 Playbook Audit
 * Queries Firestore for paused 4/20 playbooks and reviews their configuration
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !match[1].startsWith('#')) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    }
}

// Init Firebase
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = fs.existsSync(serviceAccountPath)
    ? JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    : {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function main() {
    console.log('📋 Thrive Syracuse — 4/20 Playbook Audit');
    console.log('=========================================\n');

    // Step 1: Find Thrive Syracuse org
    console.log('🔍 Step 1: Finding Thrive Syracuse org...\n');
    const orgsSnap = await db.collection('organizations').get();
    let thriveOrg = null;
    const allOrgs = [];

    for (const doc of orgsSnap.docs) {
        const data = doc.data();
        allOrgs.push({ id: doc.id, name: data.name, slug: data.slug });
        const name = (data.name || '').toLowerCase();
        const slug = (data.slug || '').toLowerCase();
        if (name.includes('thrive') || slug.includes('thrive')) {
            thriveOrg = { id: doc.id, ...data };
        }
    }

    if (!thriveOrg) {
        console.log('⚠️  No Thrive org found in organizations collection.');
        console.log('   All orgs:', allOrgs.map(o => `${o.name} (${o.id})`).join(', '));

        // Try searching by owner email
        console.log('\n🔍 Searching users for Thrive owners...');
        const usersSnap = await db.collection('users')
            .where('email', 'in', ['halysaleis@gmail.com', 'adggiles@aol.com']).get();

        if (!usersSnap.empty) {
            for (const doc of usersSnap.docs) {
                console.log(`   Found user: ${doc.data().email} → orgId: ${doc.data().orgId || doc.data().organizationId || 'N/A'}`);
            }
        }
    } else {
        console.log(`✅ Found: ${thriveOrg.name} (${thriveOrg.id})`);
    }

    // Step 2: Find ALL playbooks for Thrive (broad search)
    const orgId = thriveOrg?.id;
    const possibleOrgIds = [orgId].filter(Boolean);

    // Also search by owner emails
    const ownerEmails = ['halysaleis@gmail.com', 'adggiles@aol.com'];

    console.log('\n🔍 Step 2: Searching for playbooks...\n');

    let allPlaybooks = [];

    // Search by orgId
    for (const oid of possibleOrgIds) {
        const snap = await db.collection('playbooks').where('orgId', '==', oid).get();
        for (const doc of snap.docs) {
            allPlaybooks.push({ id: doc.id, ...doc.data() });
        }
    }

    // Also try searching by ownerName or ownerId containing Thrive
    if (allPlaybooks.length === 0) {
        console.log('   No playbooks found by orgId. Trying broader search...\n');
        const snap = await db.collection('playbooks')
            .where('status', '==', 'paused')
            .limit(50)
            .get();
        for (const doc of snap.docs) {
            allPlaybooks.push({ id: doc.id, ...doc.data() });
        }

        // Also get all playbooks to find Thrive ones
        const allSnap = await db.collection('playbooks').limit(200).get();
        allPlaybooks = [];
        for (const doc of allSnap.docs) {
            const data = doc.data();
            allPlaybooks.push({ id: doc.id, ...data });
        }
    }

    // Filter for 4/20 related playbooks or Thrive-related
    const thrivePlaybooks = allPlaybooks.filter(pb => {
        const name = (pb.name || '').toLowerCase();
        const desc = (pb.description || '').toLowerCase();
        const displayName = (pb.displayName || '').toLowerCase();
        const orgMatch = !orgId || pb.orgId === orgId;
        const has420 = name.includes('4/20') || name.includes('420') || desc.includes('4/20') || desc.includes('420') ||
            displayName.includes('4/20') || displayName.includes('420');
        const hasThrive = name.includes('thrive') || desc.includes('thrive') || pb.ownerName?.toLowerCase().includes('thrive');
        return orgMatch || has420 || hasThrive;
    });

    console.log(`📊 Found ${allPlaybooks.length} total playbooks, ${thrivePlaybooks.length} Thrive/4/20 related\n`);

    if (thrivePlaybooks.length === 0) {
        // List all playbooks for manual inspection
        console.log('📋 All playbooks in Firestore:');
        for (const pb of allPlaybooks) {
            const marker = pb.status === 'paused' ? '⏸️ ' : '  ';
            console.log(`   ${marker}${pb.name || 'Untitled'} (${pb.id})`);
            console.log(`      Status: ${pb.status} | Org: ${pb.orgId} | Owner: ${pb.ownerName || pb.ownerId}`);
        }
        console.log('\n⚠️  No 4/20 or Thrive-specific playbooks found.');
    } else {
        // Detailed audit of each matching playbook
        for (const pb of thrivePlaybooks) {
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`📋 PLAYBOOK: ${pb.name || pb.displayName || 'Untitled'}`);
            console.log(`   ID: ${pb.id}`);
            console.log(`   Status: ${pb.status}`);
            console.log(`   Category: ${pb.category}`);
            console.log(`   Agent: ${pb.agent}`);
            console.log(`   Org: ${pb.orgId}`);
            console.log(`   Owner: ${pb.ownerName || pb.ownerId}`);
            console.log(`   Version: ${pb.version}`);
            console.log(`   Is Custom: ${pb.isCustom}`);
            console.log(`   Description: ${pb.description || 'N/A'}`);
            console.log(`   Autonomy Level: ${pb.autonomyLevel || 'N/A'}`);
            console.log(`   Requires Approval: ${pb.requiresApproval}`);
            console.log(`   Approval Policy: ${JSON.stringify(pb.approvalPolicy || 'N/A')}`);
            console.log(`   Run Count: ${pb.runCount || 0}`);
            console.log(`   Success Count: ${pb.successCount || 0}`);
            console.log(`   Failure Count: ${pb.failureCount || 0}`);
            console.log(`   Last Run: ${pb.lastRunAt?.toDate?.()?.toISOString() || 'Never'}`);
            console.log(`   Created: ${pb.createdAt?.toDate?.()?.toISOString() || 'N/A'}`);
            console.log(`   Updated: ${pb.updatedAt?.toDate?.()?.toISOString() || 'N/A'}`);
            console.log(`   Created By: ${pb.createdBy}`);

            // Triggers
            console.log('\n   📌 TRIGGERS:');
            if (pb.triggers && pb.triggers.length > 0) {
                for (const t of pb.triggers) {
                    console.log(`      - Type: ${t.type}${t.cron ? ` | Cron: ${t.cron}` : ''}${t.timezone ? ` | TZ: ${t.timezone}` : ''}`);
                    console.log(`        Event: ${t.eventName || 'N/A'} | Enabled: ${t.enabled !== false}`);
                }
            } else {
                console.log('      (none defined)');
            }

            // Steps
            console.log('\n   📌 STEPS:');
            if (pb.steps && pb.steps.length > 0) {
                for (let i = 0; i < pb.steps.length; i++) {
                    const step = pb.steps[i];
                    console.log(`      ${i + 1}. ${step.label || step.action}`);
                    console.log(`         Action: ${step.action}`);
                    console.log(`         Params: ${JSON.stringify(step.params || {}).substring(0, 200)}`);
                    if (step.agent) console.log(`         Agent: ${step.agent}`);
                    if (step.condition) console.log(`         Condition: ${step.condition}`);
                    if (step.retryOnFailure) console.log(`         Retry: ${step.retryOnFailure} (max: ${step.maxRetries || 3})`);
                }
            } else {
                console.log('      (none defined)');
            }

            // Compiled Spec
            if (pb.compiledSpec) {
                console.log('\n   📌 COMPILED SPEC:');
                const spec = pb.compiledSpec;
                console.log(`      Type: ${spec.playbookType || 'N/A'}`);
                console.log(`      Display Name: ${spec.displayName || 'N/A'}`);
                if (spec.questions) {
                    console.log(`      Questions: ${JSON.stringify(spec.questions).substring(0, 300)}`);
                }
                if (spec.outputSpec) {
                    console.log(`      Output Spec: ${JSON.stringify(spec.outputSpec).substring(0, 300)}`);
                }
            }

            // Metadata
            if (pb.metadata) {
                console.log('\n   📌 METADATA:');
                console.log(`      ${JSON.stringify(pb.metadata).substring(0, 500)}`);
            }

            // YAML source
            if (pb.yaml) {
                console.log('\n   📌 YAML SOURCE:');
                console.log(pb.yaml.substring(0, 1000));
            }

            // Fetch runs for this playbook
            console.log('\n   📌 RECENT RUNS:');
            try {
                const runsSnap = await db.collection('playbookRuns')
                    .where('playbookId', '==', pb.id)
                    .limit(5)
                    .get();

                if (runsSnap.empty) {
                    console.log('      (no runs found)');
                } else {
                    for (const runDoc of runsSnap.docs) {
                        const run = runDoc.data();
                        const started = run.startedAt?.toDate?.()?.toISOString() || 'N/A';
                        const completed = run.completedAt?.toDate?.()?.toISOString() || 'N/A';
                        console.log(`      Run ${runDoc.id}:`);
                        console.log(`         Status: ${run.status} | RunStatus: ${run.runStatus || 'N/A'}`);
                        console.log(`         Started: ${started} | Completed: ${completed}`);
                        console.log(`         Confidence: ${run.confidence || 'N/A'}`);
                        console.log(`         Trigger: ${run.triggerType}`);
                        if (run.steps) {
                            for (const s of run.steps) {
                                console.log(`         → ${s.action}: ${s.status}${s.error ? ` (${s.error})` : ''}`);
                            }
                        }
                    }
                }
            } catch (runErr) {
                console.log(`      (could not fetch runs: ${runErr.message?.substring(0, 80)})`);
            }

            console.log('');
        }
    }

    // Step 3: Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 AUDIT SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total playbooks scanned: ${allPlaybooks.length}`);
    console.log(`Thrive/4/20 related: ${thrivePlaybooks.length}`);

    const paused = thrivePlaybooks.filter(p => p.status === 'paused');
    const active = thrivePlaybooks.filter(p => p.status === 'active');
    const draft = thrivePlaybooks.filter(p => p.status === 'draft');
    const error = thrivePlaybooks.filter(p => p.status === 'error');

    console.log(`  Paused: ${paused.length} | Active: ${active.length} | Draft: ${draft.length} | Error: ${error.length}`);

    if (paused.length > 0) {
        console.log('\n⏸️  PAUSED PLAYBOOKS (4/20 related):');
        for (const pb of paused) {
            console.log(`   - "${pb.name || pb.displayName}" (${pb.id})`);
            console.log(`     Category: ${pb.category} | Agent: ${pb.agent}`);
            console.log(`     Steps: ${pb.steps?.length || 0} | Triggers: ${pb.triggers?.length || 0}`);
            console.log(`     Runs: ${pb.runCount || 0} (✅${pb.successCount || 0} ❌${pb.failureCount || 0})`);
        }
    }

    console.log('\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });