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
  console.log('=== THRIVE SYRACUSE METRICS ===\n');

  // 4/20 Campaign Status
  console.log('📧 4/20 CAMPAIGNS (April 20, 2026):');
  try {
    const campSnap = await db.collection('organizations')
      .doc('org_thrive_syracuse')
      .collection('campaigns')
      .where('createdAt', '>=', Timestamp.fromDate(new Date('2026-04-20T00:00:00Z')))
      .where('createdAt', '<=', Timestamp.fromDate(new Date('2026-04-20T23:59:59Z')))
      .get();

    if (campSnap.empty) {
      console.log('  ❌ No campaigns created on 4/20');
    } else {
      campSnap.docs.forEach(doc => {
        const c = doc.data();
        console.log(`  • ${c.name || 'Unnamed'}`);
        console.log(`    Type: ${c.type} | Channel: ${c.channel}`);
        console.log(`    Status: ${c.status}`);
        console.log(`    Sent: ${c.sentCount || 0} | Scheduled: ${c.scheduledTime ? new Date(c.scheduledTime.toDate()).toISOString() : 'N/A'}`);
      });
    }
  } catch (e) {
    console.error('  Error querying campaigns:', e.message);
  }

  // Yesterday's Sales (April 19, 2026)
  console.log('\n💰 SALES - April 19, 2026:');
  try {
    const orderSnap = await db.collection('organizations')
      .doc('org_thrive_syracuse')
      .collection('orders')
      .where('createdAt', '>=', Timestamp.fromDate(new Date('2026-04-19T00:00:00Z')))
      .where('createdAt', '<=', Timestamp.fromDate(new Date('2026-04-19T23:59:59Z')))
      .get();

    let totalRevenue = 0;
    let orderCount = 0;

    orderSnap.docs.forEach(doc => {
      const order = doc.data();
      if (order.total) {
        totalRevenue += order.total;
        orderCount++;
      }
    });

    console.log(`  Orders: ${orderCount}`);
    console.log(`  Revenue: $${totalRevenue.toFixed(2)}`);
    if (orderCount > 0) {
      console.log(`  Avg order: $${(totalRevenue / orderCount).toFixed(2)}`);
    }
  } catch (e) {
    console.error('  Error querying orders:', e.message);
  }

  // Check for any campaign_sends on 4/20
  console.log('\n📤 CAMPAIGN SENDS - April 20, 2026:');
  try {
    const sendSnap = await db.collection('organizations')
      .doc('org_thrive_syracuse')
      .collection('campaign_sends')
      .where('sentAt', '>=', Timestamp.fromDate(new Date('2026-04-20T00:00:00Z')))
      .where('sentAt', '<=', Timestamp.fromDate(new Date('2026-04-20T23:59:59Z')))
      .get();

    if (sendSnap.empty) {
      console.log('  ❌ No campaigns sent on 4/20');
    } else {
      console.log(`  ✅ ${sendSnap.size} campaign(s) sent`);
      sendSnap.docs.forEach(doc => {
        const send = doc.data();
        console.log(`    • Type: ${send.type} | Count: ${send.recipientCount || 0}`);
      });
    }
  } catch (e) {
    console.error('  Error querying campaign sends:', e.message);
  }

  process.exit(0);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
