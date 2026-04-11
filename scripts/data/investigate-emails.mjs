/**
 * Investigate email matching between customers and customer_spending collections.
 * Uses dotenv to load .env.local for FIREBASE_SERVICE_ACCOUNT_KEY.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) {
    process.env[key] = val;
  }
}

// Now init firebase-admin
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    // Try local file
    try {
      const sa = JSON.parse(readFileSync(resolve(process.cwd(), 'service-account.json'), 'utf-8'));
      return sa;
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }
}

const sa = parseServiceAccount();
if (!sa) {
  console.error('No service account found');
  process.exit(1);
}

// Fix private_key newlines
if (sa.private_key) {
  sa.private_key = sa.private_key.replace(/\\n/g, '\n');
}

const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

const ORG_ID = 'org_thrive_syracuse';

async function investigate() {
  console.log('=== EMAIL MATCHING INVESTIGATION ===\n');

  // 1. Get all customers
  console.log('Fetching customers...');
  const custSnap = await db.collection('customers').where('orgId', '==', ORG_ID).get();
  console.log(`Total customers in collection: ${custSnap.size}`);

  const customerEmails = new Set();
  const customerDetails = [];
  custSnap.docs.forEach(doc => {
    const d = doc.data();
    const email = (d.email || '').toLowerCase().trim();
    customerDetails.push({
      docId: doc.id,
      email: email || '(none)',
      name: d.name || d.displayName || '(unknown)',
      phone: d.phone || '(none)',
      orderCount: d.orderCount || 0,
      totalSpent: d.totalSpent || 0,
    });
    if (email) customerEmails.add(email);
  });

  console.log(`Customers with email: ${customerEmails.size}`);
  console.log(`Customers without email: ${custSnap.size - customerEmails.size}`);

  // 2. Get all customer_spending docs
  console.log('\nFetching customer_spending...');
  const spendSnap = await db.collection('tenants').doc(ORG_ID).collection('customer_spending').get();
  console.log(`Total customer_spending docs: ${spendSnap.size}`);

  const spendingEmails = new Set();
  const spendingDetails = [];
  spendSnap.docs.forEach(doc => {
    const d = doc.data();
    const email = doc.id.toLowerCase().trim();
    spendingEmails.add(email);
    spendingDetails.push({
      docId: doc.id,
      email,
      totalSpent: d.totalSpent || 0,
      orderCount: d.orderCount || 0,
      avgOrderValue: d.avgOrderValue || 0,
      lastOrderDate: d.lastOrderDate?.toDate?.()?.toISOString?.() || d.lastOrderDate || '(none)',
    });
  });

  // 3. Compare
  console.log('\n=== COMPARISON ===');
  const matched = [...customerEmails].filter(e => spendingEmails.has(e));
  const custOnly = [...customerEmails].filter(e => !spendingEmails.has(e));
  const spendOnly = [...spendingEmails].filter(e => !customerEmails.has(e));

  console.log(`Matched emails (in both): ${matched.length}`);
  console.log(`In customers ONLY (no spending data): ${custOnly.length}`);
  console.log(`In spending ONLY (no customer record): ${spendOnly.length}`);

  if (matched.length > 0) {
    console.log('\nMatched emails (sample):');
    matched.slice(0, 5).forEach(e => console.log(`  ✓ ${e}`));
  }

  if (custOnly.length > 0) {
    console.log('\nCustomer-only emails (no spending match):');
    custOnly.forEach(e => console.log(`  ✗ ${e}`));
  }

  if (spendOnly.length > 0) {
    console.log('\nSpending-only emails (no customer record):');
    spendOnly.forEach(e => console.log(`  ✗ ${e}`));
  }

  // 4. Show all customer details
  console.log('\n=== ALL CUSTOMERS ===');
  customerDetails.forEach(c => {
    const hasSpending = spendingEmails.has(c.email);
    console.log(`  ${c.email} | ${c.name} | orders=${c.orderCount} | spent=$${c.totalSpent} | spending_match=${hasSpending}`);
  });

  // 5. Show all spending details
  console.log('\n=== ALL CUSTOMER_SPENDING ===');
  spendingDetails.forEach(s => {
    const hasCust = customerEmails.has(s.email);
    console.log(`  ${s.email} | orders=${s.orderCount} | spent=$${s.totalSpent} | avg=$${s.avgOrderValue} | last=${s.lastOrderDate} | cust_match=${hasCust}`);
  });

  // 6. Loyalty email count
  const loyaltyEmails = new Set([...customerEmails, ...spendingEmails]);
  console.log(`\n=== LOYALTY PROGRAM ===`);
  console.log(`Total unique emails across both collections: ${loyaltyEmails.size}`);
  console.log(`Emails with customer profiles: ${customerEmails.size}`);
  console.log(`Emails with spending data: ${spendingEmails.size}`);

  process.exit(0);
}

investigate().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
