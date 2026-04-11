import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')); } catch { return null; } }
}
const sa = parseServiceAccount();
if (sa?.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

const ORG_ID = 'org_thrive_syracuse';

async function main() {
  // Get 5 spending docs with all their fields
  const snap = await db.collection('tenants').doc(ORG_ID).collection('customer_spending').limit(5).get();
  console.log('=== SAMPLE SPENDING DOCS (ALL FIELDS) ===\n');
  snap.docs.forEach(doc => {
    console.log(`Doc ID: ${doc.id}`);
    const d = doc.data();
    for (const [k, v] of Object.entries(d)) {
      const val = v?.toDate ? v.toDate().toISOString() : v;
      console.log(`  ${k}: ${JSON.stringify(val)}`);
    }
    console.log('');
  });

  // Also check if orders have customerId or email
  console.log('=== SAMPLE ORDERS (checking customer fields) ===\n');
  const ordersSnap = await db.collection('orders').where('brandId', '==', ORG_ID).limit(5).get();
  ordersSnap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`Order: ${doc.id}`);
    console.log(`  customerId: ${d.customerId || '(none)'}`);
    console.log(`  customerEmail: ${d.customerEmail || d.email || '(none)'}`);
    console.log(`  customerName: ${d.customerName || d.customer_name || '(none)'}`);
    console.log(`  customerPhone: ${d.customerPhone || d.phone || '(none)'}`);
    // Show all keys that contain 'customer' or 'email'
    const relevantKeys = Object.keys(d).filter(k => /customer|email|phone|name/i.test(k));
    console.log(`  relevant keys: ${relevantKeys.join(', ')}`);
    console.log('');
  });

  // Check how POS sync writes spending
  console.log('=== SPENDING DOCS WITH MOST ORDERS (top 5) ===\n');
  const allSpend = await db.collection('tenants').doc(ORG_ID).collection('customer_spending').orderBy('orderCount', 'desc').limit(5).get();
  allSpend.docs.forEach(doc => {
    const d = doc.data();
    console.log(`Doc ID: ${doc.id}`);
    for (const [k, v] of Object.entries(d)) {
      const val = v?.toDate ? v.toDate().toISOString() : v;
      console.log(`  ${k}: ${JSON.stringify(val)}`);
    }
    console.log('');
  });

  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
