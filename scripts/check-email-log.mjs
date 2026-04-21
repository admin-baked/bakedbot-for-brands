// Check recent email logs in Firestore customer_communications
// Looking for emails sent around 04:45 UTC on April 19 (10:45 PM CST April 18)
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

// Window: April 19 04:00 UTC → April 19 06:00 UTC (covers 10 PM–midnight CST April 18)
const start = new Date('2026-04-19T04:00:00Z');
const end = new Date('2026-04-19T06:30:00Z');

async function main() {
  console.log(`\nSearching customer_communications sent between ${start.toISOString()} and ${end.toISOString()}`);
  console.log('(= 10:00 PM – 12:30 AM CST April 18–19)\n');

  // Search across all orgs - look at top-level collection if it exists
  // Or check org sub-collections
  const orgs = await db.collection('organizations').get();
  let found = 0;

  for (const orgDoc of orgs.docs) {
    const orgId = orgDoc.id;
    const commsRef = db.collection('organizations').doc(orgId).collection('customer_communications');
    const snap = await commsRef
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    if (!snap.empty) {
      for (const doc of snap.docs) {
        const d = doc.data();
        found++;
        console.log(`[${orgId}]`);
        console.log(`  id: ${doc.id}`);
        console.log(`  channel: ${d.channel}`);
        console.log(`  type: ${d.type}`);
        console.log(`  subject: ${d.subject}`);
        console.log(`  to: ${d.customerEmail}`);
        console.log(`  provider: ${d.provider}`);
        console.log(`  agentName: ${d.agentName}`);
        console.log(`  campaignId: ${d.campaignId}`);
        console.log(`  createdAt: ${d.createdAt?.toDate?.().toISOString()}`);
        console.log('');
      }
    }
  }

  // Also check a flat customer_communications collection at root
  try {
    const flatSnap = await db.collection('customer_communications')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    if (!flatSnap.empty) {
      console.log('\n--- Root-level customer_communications ---');
      for (const doc of flatSnap.docs) {
        const d = doc.data();
        found++;
        console.log(`  id: ${doc.id}`);
        console.log(`  org: ${d.orgId}`);
        console.log(`  channel: ${d.channel}`);
        console.log(`  type: ${d.type}`);
        console.log(`  subject: ${d.subject}`);
        console.log(`  to: ${d.customerEmail}`);
        console.log(`  provider: ${d.provider}`);
        console.log(`  agentName: ${d.agentName}`);
        console.log(`  createdAt: ${d.createdAt?.toDate?.().toISOString()}`);
        console.log('');
      }
    }
  } catch (e) {
    // might not exist
  }

  if (found === 0) {
    console.log('No communications found in this window. Check if logCrm ran or if emails were sent without CRM logging.');
  } else {
    console.log(`Total: ${found} communication(s) found`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
