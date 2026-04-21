// Check campaigns and email_threads for emails sent around 10:45 PM CST April 18
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

const start = new Date('2026-04-19T04:00:00Z');
const end = new Date('2026-04-19T06:30:00Z');

async function checkCollection(path, label) {
  try {
    const parts = path.split('/');
    let ref = db.collection(parts[0]);
    for (let i = 1; i < parts.length; i += 2) {
      ref = ref.doc(parts[i]).collection(parts[i+1]);
    }
    const snap = await ref
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    if (!snap.empty) {
      console.log(`\n=== ${label} (${path}) ===`);
      snap.docs.forEach(d => {
        const data = d.data();
        console.log(JSON.stringify({ id: d.id, ...data, htmlBody: undefined, html: undefined }, null, 2));
      });
      return snap.size;
    }
  } catch (e) {
    // ignore missing collections or index errors
  }
  return 0;
}

async function main() {
  console.log(`Checking activity from ${start.toISOString()} to ${end.toISOString()}\n`);
  let found = 0;

  // Check top-level email_threads (outbound emails)
  found += await checkCollection('email_threads', 'Email Threads');

  // Check campaigns updated in window
  try {
    const orgs = await db.collection('organizations').get();
    for (const org of orgs.docs) {
      const snap = await db.collection('organizations').doc(org.id).collection('campaigns')
        .where('updatedAt', '>=', Timestamp.fromDate(start))
        .where('updatedAt', '<=', Timestamp.fromDate(end))
        .limit(5).get();
      if (!snap.empty) {
        console.log(`\n=== campaigns for ${org.id} ===`);
        snap.docs.forEach(d => {
          const data = d.data();
          console.log(JSON.stringify({
            id: d.id,
            name: data.name,
            status: data.status,
            type: data.type,
            channel: data.channel,
            subject: data.subject,
            sentCount: data.sentCount,
            updatedAt: data.updatedAt?.toDate?.().toISOString(),
            createdAt: data.createdAt?.toDate?.().toISOString(),
          }, null, 2));
        });
        found += snap.size;
      }
    }
  } catch (e) { console.error('campaigns check error:', e.message); }

  // Check agent_tasks for email-related tasks in window
  try {
    const snap = await db.collection('agent_tasks')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .limit(10).get();
    if (!snap.empty) {
      console.log('\n=== Agent Tasks ===');
      snap.docs.forEach(d => {
        const data = d.data();
        console.log(JSON.stringify({
          id: d.id,
          title: data.title,
          assignedTo: data.assignedTo,
          status: data.status,
          createdAt: data.createdAt?.toDate?.().toISOString(),
        }, null, 2));
      });
      found += snap.size;
    }
  } catch (e) { /* ignore */ }

  // Check playbook executions
  try {
    const snap = await db.collection('playbook_executions')
      .where('startedAt', '>=', Timestamp.fromDate(start))
      .where('startedAt', '<=', Timestamp.fromDate(end))
      .limit(10).get();
    if (!snap.empty) {
      console.log('\n=== Playbook Executions ===');
      snap.docs.forEach(d => {
        const data = d.data();
        console.log(JSON.stringify({
          id: d.id,
          playbookId: data.playbookId,
          orgId: data.orgId,
          status: data.status,
          startedAt: data.startedAt?.toDate?.().toISOString(),
        }, null, 2));
      });
      found += snap.size;
    }
  } catch (e) { /* ignore */ }

  if (found === 0) {
    console.log('Nothing found. The email may have been sent via the bulk-wakeup script or a direct API call that did not log to Firestore.');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
