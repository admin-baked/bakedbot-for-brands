#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

async function main() {
  console.log('=== THRIVE SYRACUSE - DETAILED CHECKS ===\n');

  // Check for ANY recent campaigns (last 7 days)
  console.log('📧 Recent Campaigns (last 7 days):');
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const campSnap = await db.collection('organizations')
      .doc('org_thrive_syracuse')
      .collection('campaigns')
      .where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (campSnap.empty) {
      console.log('  ❌ No campaigns in last 7 days');
    } else {
      console.log(`  Found ${campSnap.size} campaigns:`);
      campSnap.docs.forEach(doc => {
        const c = doc.data();
        const created = c.createdAt?.toDate?.() || new Date();
        console.log(`    • ${c.name || 'Unnamed'}`);
        console.log(`      Created: ${created.toISOString()}`);
        console.log(`      Status: ${c.status} | Type: ${c.type}`);
      });
    }
  } catch (e) {
    console.error('  Error:', e.message);
  }

  // Check April sales (any date)
  console.log('\n💰 April 2026 Sales Overview:');
  try {
    const aprilStart = Timestamp.fromDate(new Date('2026-04-01T00:00:00Z'));
    const aprilEnd = Timestamp.fromDate(new Date('2026-04-30T23:59:59Z'));
    const orderSnap = await db.collection('organizations')
      .doc('org_thrive_syracuse')
      .collection('orders')
      .where('createdAt', '>=', aprilStart)
      .where('createdAt', '<=', aprilEnd)
      .limit(50)
      .get();

    let totalRev = 0;
    const dateMap = {};
    orderSnap.docs.forEach(doc => {
      const o = doc.data();
      if (o.total) totalRev += o.total;
      const date = o.createdAt?.toDate?.()?.toISOString?.()?.split('T')[0] || 'unknown';
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    if (orderSnap.empty) {
      console.log('  ❌ No orders in April');
    } else {
      console.log(`  Total April orders: ${orderSnap.size}`);
      console.log(`  Total April revenue: $${totalRev.toFixed(2)}`);
      console.log(`  By date:`);
      Object.entries(dateMap).sort().forEach(([date, count]) => {
        console.log(`    ${date}: ${count} orders`);
      });
    }
  } catch (e) {
    console.error('  Error:', e.message);
  }

  // Check playbook executions related to campaign
  console.log('\n🎬 Recent Playbook Executions (last 2 days):');
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pbSnap = await db.collection('playbook_executions')
      .where('orgId', '==', 'org_thrive_syracuse')
      .where('startedAt', '>=', Timestamp.fromDate(twoDaysAgo))
      .orderBy('startedAt', 'desc')
      .limit(20)
      .get();

    if (pbSnap.empty) {
      console.log('  ❌ No playbook executions');
    } else {
      console.log(`  Found ${pbSnap.size} executions:`);
      pbSnap.docs.forEach(doc => {
        const pb = doc.data();
        const started = pb.startedAt?.toDate?.() || new Date();
        console.log(`    • ${pb.playbookId}`);
        console.log(`      Started: ${started.toISOString()} | Status: ${pb.status || 'unknown'}`);
      });
    }
  } catch (e) {
    console.error('  Error:', e.message);
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
