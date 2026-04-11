import { readFileSync } from 'fs';
import { resolve } from 'path';
const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('='); if (eq === -1) continue;
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseSA() {
  const r = process.env.FIREBASE_SERVICE_ACCOUNT_KEY; if (!r) return null;
  try { return JSON.parse(r); } catch { try { return JSON.parse(Buffer.from(r, 'base64').toString('utf-8')); } catch { return null; } }
}
const sa = parseSA(); if (sa?.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
const app = initializeApp({ credential: cert(sa) }); const db = getFirestore(app);

const ORG_ID = 'org_thrive_syracuse';
const ALLEAVES_API_BASE = 'https://app.alleaves.com/api';

function parseCustomerResponse(data) {
  if (Array.isArray(data)) return data;
  const arr = [];
  for (const key of Object.keys(data)) {
    if (/^\d+$/.test(key) && typeof data[key] === 'object') arr.push(data[key]);
  }
  return arr;
}

async function main() {
  const locSnap = await db.collection('locations').where('orgId', '==', ORG_ID).limit(1).get();
  const posConfig = locSnap.docs[0]?.data()?.posConfig;
  const username = posConfig?.username || process.env.ALLEAVES_USERNAME;
  const password = posConfig?.password || process.env.ALLEAVES_PASSWORD;
  const pin = posConfig?.pin || process.env.ALLEAVES_PIN;

  const authRes = await fetch(`${ALLEAVES_API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, pin }),
  });
  const authData = await authRes.json();
  const token = authData.token;
  console.log('Authenticated!\n');

  // =====================================================
  // PART 1: Get ALL customers with email OR phone — full details
  // =====================================================
  const contactable = [];
  const loyaltyData = [];

  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`${ALLEAVES_API_BASE}/customer/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ page, pageSize: 100 }),
    });
    if (!res.ok) break;
    const raw = await res.json();
    const custs = parseCustomerResponse(raw);
    if (custs.length === 0) break;

    for (const c of custs) {
      const email = c.email || '';
      const phone = c.phone || '';
      const isGuest = (c.name_first || '').toLowerCase() === 'guest';

      // Collect customers with any contact info
      if (email || phone) {
        contactable.push({
          id_customer: c.id_customer,
          name: c.full_name || `${c.name_first || ''} ${c.name_last || ''}`.trim(),
          email: email || null,
          phone: phone || null,
          phone2: c.phone2 || null,
          loyalty_points: c.loyalty_points || 0,
          total_spent: c.total_spent || 0,
          order_count: c.order_count || 0,
          last_order_date: c.last_order_date || null,
          date_of_birth: c.date_of_birth || null,
          customer_since: c.customer_since || c.date_created,
          state: c.state || null,
          city: c.city || null,
          isGuest,
        });
      }

      // Check EVERY customer for loyalty points
      if (c.loyalty_points && c.loyalty_points > 0) {
        loyaltyData.push({
          id: c.id_customer,
          name: c.full_name,
          points: c.loyalty_points,
          email: email || '(none)',
        });
      }
    }

    process.stdout.write(`  Page ${page} scanned...\r`);
    if (custs.length < 100) break;
  }

  // =====================================================
  // PART 2: Report contactable customers
  // =====================================================
  console.log('\n\n=== CONTACTABLE CUSTOMERS FROM ALLEAVES ===');
  console.log(`Total with email or phone: ${contactable.length}`);

  const withEmail = contactable.filter(c => c.email);
  const withPhone = contactable.filter(c => c.phone);
  const withBoth = contactable.filter(c => c.email && c.phone);
  const emailOnly = contactable.filter(c => c.email && !c.phone);
  const phoneOnly = contactable.filter(c => !c.email && c.phone);

  console.log(`  With email: ${withEmail.length}`);
  console.log(`  With phone: ${withPhone.length}`);
  console.log(`  With both: ${withBoth.length}`);
  console.log(`  Email only: ${emailOnly.length}`);
  console.log(`  Phone only: ${phoneOnly.length}`);

  console.log('\n--- ALL CUSTOMERS WITH EMAIL ---');
  withEmail.forEach(c => {
    console.log(`  ${c.name} | ${c.email} | phone=${c.phone || 'none'} | loyalty=${c.loyalty_points} | spent=$${c.total_spent || 0} | orders=${c.order_count || 0} | since=${c.customer_since}`);
  });

  console.log('\n--- CUSTOMERS WITH PHONE ONLY (no email) ---');
  phoneOnly.slice(0, 30).forEach(c => {
    console.log(`  ${c.name} | phone=${c.phone} | loyalty=${c.loyalty_points} | spent=$${c.total_spent || 0}`);
  });
  if (phoneOnly.length > 30) console.log(`  ... and ${phoneOnly.length - 30} more`);

  // =====================================================
  // PART 3: Loyalty points report
  // =====================================================
  console.log('\n=== LOYALTY POINTS ===');
  if (loyaltyData.length > 0) {
    console.log(`Customers with loyalty points > 0: ${loyaltyData.length}`);
    loyaltyData.forEach(c => console.log(`  ${c.name} | ${c.email} | ${c.points} pts`));
  } else {
    console.log('No customers have loyalty_points > 0 in Alleaves.');
    console.log('The loyalty_points field exists but is 0/null for all 3628 customers.');
    console.log('This means loyalty tracking is either:');
    console.log('  1. Not enabled in Alleaves settings, OR');
    console.log('  2. Managed by a separate loyalty platform (AIQ/SpringBig) not linked to Alleaves');
  }

  // =====================================================
  // PART 4: Check our check-in data for comparison
  // =====================================================
  console.log('\n=== OUR CHECK-IN DATA (Firestore) ===');
  // Check for check-in records
  const checkinSnap = await db.collection('checkins')
    .where('orgId', '==', ORG_ID)
    .limit(20)
    .get();

  if (!checkinSnap.empty) {
    console.log(`Check-ins found: ${checkinSnap.size}+ (showing first 20)`);
    const checkinFields = new Set();
    checkinSnap.docs.forEach(doc => {
      Object.keys(doc.data()).forEach(k => checkinFields.add(k));
    });
    console.log(`Check-in fields: ${[...checkinFields].sort().join(', ')}`);
    // Show a few
    checkinSnap.docs.slice(0, 3).forEach(doc => {
      const d = doc.data();
      console.log(`  ${doc.id}: name=${d.name || d.customerName || '?'} email=${d.email || d.customerEmail || '?'} phone=${d.phone || '?'}`);
    });
  } else {
    console.log('No check-ins found in "checkins" collection');
  }

  // Check tablet check-in data
  const tabletSnap = await db.collection('tablet_checkins')
    .where('orgId', '==', ORG_ID)
    .limit(5)
    .get();
  if (!tabletSnap.empty) {
    console.log(`\nTablet check-ins: ${tabletSnap.size}+`);
    tabletSnap.docs.slice(0, 3).forEach(doc => {
      const d = doc.data();
      console.log(`  ${doc.id}: ${JSON.stringify(d).slice(0, 200)}`);
    });
  }

  // Check rewards/loyalty signups
  const rewardsSnap = await db.collection('rewards_members')
    .where('orgId', '==', ORG_ID)
    .limit(5)
    .get();
  if (!rewardsSnap.empty) {
    console.log(`\nRewards members: ${rewardsSnap.size}+`);
  }

  // Also check customers collection for check-in sourced data
  const custSnap = await db.collection('customers')
    .where('orgId', '==', ORG_ID)
    .where('isTestAccount', '!=', true)
    .limit(20)
    .get();
  console.log(`\nCustomers (non-test): ${custSnap.size}`);
  custSnap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`  ${d.email || doc.id} | source=${d.source || 'unknown'} | phone=${d.phone || 'none'}`);
  });

  process.exit(0);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
