#!/usr/bin/env node
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const key = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)), projectId: 'studio-567050101-bc6e8' });
}
const db = admin.firestore();
const ORG = 'org_thrive_syracuse';

async function testQuickLookup(last4) {
  const snap = await db.collection('customers')
    .where('orgId', '==', ORG).where('phoneLast4', '==', last4).limit(5).get();
  if (snap.empty) return { found: false };
  return { found: true, matches: snap.docs.map(d => ({ firstName: d.data().firstName, loyaltyPoints: d.data().loyaltyPoints || 0 })) };
}

async function testFullLookup(rawPhone) {
  const raw = rawPhone.replace(/\D/g, '');
  const digits = raw.length === 10 ? '1' + raw : raw;
  let snap = await db.collection('customers').where('orgId', '==', ORG).where('phoneDigits', '==', digits).limit(1).get();
  if (snap.empty) snap = await db.collection('customers').where('orgId', '==', ORG).where('phoneDigits', '==', raw).limit(1).get();
  if (snap.empty) return { found: false };
  const d = snap.docs[0].data();
  return { found: true, firstName: d.firstName, loyaltyPoints: d.loyaltyPoints || 0, visitCount: d.visitCount || 0 };
}

async function testNewCustomer() {
  const snap = await db.collection('customers').where('orgId', '==', ORG).where('phoneDigits', '==', '15550000000').limit(1).get();
  return { found: !snap.empty };
}

async function testInventory() {
  const snap = await db.collection('tenants').doc(ORG)
    .collection('publicViews').doc('products').collection('items')
    .where('source', '==', 'pos').limit(50).get();
  const cats = [...new Set(snap.docs.map(d => d.data().category))].filter(Boolean);
  const hasFlower = cats.includes('Flower');
  const hasEdibles = cats.includes('Edibles') || cats.includes('Edible');
  const hasVapes = cats.includes('Vapes') || cats.includes('Vape');
  return { total: snap.size, categories: cats, hasFlower, hasEdibles, hasVapes };
}

async function testSampleProductsGone() {
  // Check root products for any remaining sample/test items
  const sampleSnap = await db.collection('products').get();
  const bad = [];
  sampleSnap.forEach(doc => {
    const p = doc.data();
    const name = (p.name || '').toLowerCase();
    if (name.includes('sample') || name.includes('test') || (p.price || 0) < 1) {
      bad.push({ id: doc.id, name: p.name, price: p.price });
    }
  });
  return { clean: bad.length === 0, remaining: bad };
}

const [quick, full, newCust, inv, clean] = await Promise.all([
  testQuickLookup('0522'),
  testFullLookup('3126840522'),
  testNewCustomer(),
  testInventory(),
  testSampleProductsGone(),
]);

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   THRIVE KIOSK — FULL FLOW TEST (9 AM Launch)   ║');
console.log('╚══════════════════════════════════════════════════╝\n');

console.log('1. QUICK LOOKUP — last 4 digits (welcome screen)');
console.log('   Input: last4=0522 (Martez)');
console.log('   Result:', quick.found ? `Found: ${quick.matches.map(m => m.firstName).join(', ')}` : 'Not found');
console.log('   Status:', quick.found ? '✅ PASS' : '❌ FAIL');

console.log('\n2. RETURNING CUSTOMER — full phone lookup');
console.log('   Input: (312) 684-0522');
console.log('   Result:', full.found ? `${full.firstName}, ${full.visitCount} visits, ${full.loyaltyPoints} pts` : 'Not found');
console.log('   Status:', full.found ? '✅ PASS — history + visit count loads' : '❌ FAIL');

console.log('\n3. NEW CUSTOMER — unknown phone');
console.log('   Input: (555) 000-0000');
console.log('   Result:', newCust.found ? 'Unexpectedly found' : 'Not found (correct)');
console.log('   Status:', !newCust.found ? '✅ PASS — new customer path triggers correctly' : '❌ FAIL');

console.log('\n4. RECOMMENDATION INVENTORY');
console.log('   POS products available:', inv.total);
console.log('   Categories on menu:', inv.categories.join(', '));
console.log('   Flower for rec slot 1:', inv.hasFlower ? '✅' : '❌ MISSING');
console.log('   Edibles for rec slot 2:', inv.hasEdibles ? '✅' : '❌ MISSING');
console.log('   Vapes for rec slot 3:', inv.hasVapes ? '✅' : '❌ MISSING');
console.log('   Status:', (inv.hasFlower && inv.hasEdibles && inv.hasVapes) ? '✅ PASS — all 3 rec categories stocked' : '⚠️  PARTIAL');

console.log('\n5. SAMPLE PRODUCT CLEANUP');
console.log('   Status:', clean.clean ? '✅ PASS — no sample/test products remain' : `❌ ${clean.remaining.length} items still present`);
if (!clean.clean) clean.remaining.forEach(p => console.log('   ⚠️ ', p.id, p.name, '$' + p.price));

const allPass = quick.found && full.found && !newCust.found && inv.hasFlower && inv.hasEdibles && inv.hasVapes && clean.clean;
console.log('\n══════════════════════════════════════════════════');
console.log(allPass ? '🟢  ALL TESTS PASS — GO FOR 9 AM' : '🔴  ISSUES FOUND — SEE ABOVE');
console.log('══════════════════════════════════════════════════\n');

process.exit(allPass ? 0 : 1);
