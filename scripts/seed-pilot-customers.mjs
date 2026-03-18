/**
 * Seed pilot test customers for org_thrive_syracuse
 * Creates 6 real-email customers with purchase history, tiers, segments,
 * loyalty_transactions, and playbook enrollments for live controlled testing.
 *
 * Usage: node --env-file=.env.local scripts/seed-pilot-customers.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString());
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const ORG_ID = 'org_thrive_syracuse';

// ── Pilot customers ─────────────────────────────────────────────────────────
const PILOTS = [
  {
    id: 'pilot_jack',
    firstName: 'Jack',
    lastName: 'BakedBot',
    email: 'jack@bakedbot.ai',
    phone: '3155550001',
    points: 840,
    tier: 'gold',
    totalSpent: 672.50,
    orderCount: 11,
    avgOrderValue: 61.14,
    segment: 'vip',
    preferredCategories: ['flower', 'vapes'],
    preferredProducts: ['Blue Dream', 'Gelato #33'],
    priceRange: 'premium',
    customTags: ['pilot', 'internal_test', 'vip'],
  },
  {
    id: 'pilot_adeyemi',
    firstName: 'Adeyemi',
    lastName: 'Delta',
    email: 'adeyemidelta@gmail.com',
    phone: '3155550002',
    points: 1250,
    tier: 'platinum',
    totalSpent: 1100.00,
    orderCount: 18,
    avgOrderValue: 61.11,
    segment: 'loyal',
    preferredCategories: ['edibles', 'concentrates'],
    preferredProducts: ['Sour Diesel', 'Kanha Gummies'],
    priceRange: 'premium',
    customTags: ['pilot', 'internal_test', 'high_value'],
  },
  {
    id: 'pilot_haly',
    firstName: 'Haly',
    lastName: 'Sales',
    email: 'halysaleis@gmail.com',
    phone: '3155550003',
    points: 320,
    tier: 'silver',
    totalSpent: 256.00,
    orderCount: 5,
    avgOrderValue: 51.20,
    segment: 'regular',
    preferredCategories: ['flower', 'pre-rolls'],
    preferredProducts: ['OG Kush', 'Gorilla Glue'],
    priceRange: 'mid',
    customTags: ['pilot', 'internal_test'],
  },
  {
    id: 'pilot_keith',
    firstName: 'Keith',
    lastName: 'Influence',
    email: 'keith@mrinfluencecoach.com',
    phone: '3155550004',
    points: 75,
    tier: 'silver',
    totalSpent: 60.00,
    orderCount: 2,
    avgOrderValue: 30.00,
    segment: 'new',
    preferredCategories: ['edibles'],
    preferredProducts: ['Camino Gummies'],
    priceRange: 'budget',
    customTags: ['pilot', 'internal_test', 'new_customer'],
  },
  {
    id: 'pilot_rsanchez',
    firstName: 'R',
    lastName: 'Sanchez',
    email: 'rsanchez@apt113.com',
    phone: '3155550005',
    points: 520,
    tier: 'gold',
    totalSpent: 416.00,
    orderCount: 8,
    avgOrderValue: 52.00,
    segment: 'regular',
    preferredCategories: ['vapes', 'flower'],
    preferredProducts: ['Pax Era Pod', 'Purple Punch'],
    priceRange: 'mid',
    customTags: ['pilot', 'internal_test'],
  },
  {
    id: 'pilot_martez',
    firstName: 'Martez',
    lastName: 'Knox',
    email: 'martez@bakedbot.ai',
    phone: '3155550006',
    points: 1875,
    tier: 'platinum',
    totalSpent: 1500.00,
    orderCount: 24,
    avgOrderValue: 62.50,
    segment: 'vip',
    preferredCategories: ['flower', 'concentrates', 'vapes'],
    preferredProducts: ['Wedding Cake', 'Live Resin', 'Jeeter Infused'],
    priceRange: 'premium',
    customTags: ['pilot', 'internal_test', 'vip', 'founder'],
  },
];

// ── Product catalog for purchase history ────────────────────────────────────
const PRODUCTS = [
  { name: 'Blue Dream 3.5g', category: 'flower', price: 45.00 },
  { name: 'Gelato #33 3.5g', category: 'flower', price: 55.00 },
  { name: 'OG Kush 1g Pre-Roll', category: 'pre-rolls', price: 12.00 },
  { name: 'Gorilla Glue 3.5g', category: 'flower', price: 42.00 },
  { name: 'Kanha Gummies 100mg', category: 'edibles', price: 25.00 },
  { name: 'Camino Gummies 100mg', category: 'edibles', price: 22.00 },
  { name: 'Sour Diesel Live Resin 1g', category: 'concentrates', price: 65.00 },
  { name: 'Pax Era Pod .5g', category: 'vapes', price: 48.00 },
  { name: 'Purple Punch 3.5g', category: 'flower', price: 50.00 },
  { name: 'Wedding Cake 7g', category: 'flower', price: 85.00 },
  { name: 'Jeeter Infused Pre-Roll', category: 'pre-rolls', price: 18.00 },
  { name: 'Live Resin Badder 1g', category: 'concentrates', price: 70.00 },
];

// ── Playbooks to enroll into ─────────────────────────────────────────────────
const PLAYBOOK_IDS = {
  welcome: 'playbook_org_thrive_syracuse_welcome',
  weeklyEmail: 'T5czmjxuvO3MOQTxL9aA',
  competitive: 'c1boBTwmKyPo23Ib1C7o',
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePurchaseHistory(customer) {
  const history = [];
  const orderCount = customer.orderCount;
  const spread = Math.max(90, orderCount * 7);

  for (let i = 0; i < orderCount; i++) {
    const daysBack = Math.floor((i / orderCount) * spread) + Math.floor(Math.random() * 5);
    const itemCount = Math.ceil(Math.random() * 2) + 1;
    const items = [];
    let subtotal = 0;

    for (let j = 0; j < itemCount; j++) {
      const product = randomFrom(PRODUCTS);
      const qty = 1;
      items.push({ name: product.name, category: product.category, price: product.price, qty });
      subtotal += product.price * qty;
    }

    const tax = parseFloat((subtotal * 0.13).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    const pointsEarned = Math.floor(subtotal);

    history.push({
      orderId: `order_pilot_${customer.id}_${i + 1}`,
      customerId: customer.id,
      orgId: ORG_ID,
      items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax,
      total,
      pointsEarned,
      source: 'in_store',
      createdAt: daysAgo(daysBack),
    });
  }

  return history;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const batch = db.batch();
let writeCount = 0;

for (const pilot of PILOTS) {
  const now = Timestamp.now();
  const enrolledAt = daysAgo(Math.floor(pilot.orderCount * 5));

  // Customer doc
  const custRef = db.collection('customers').doc(pilot.id);
  batch.set(custRef, {
    id: pilot.id,
    orgId: ORG_ID,
    firstName: pilot.firstName,
    lastName: pilot.lastName,
    displayName: `${pilot.firstName} ${pilot.lastName}`,
    email: pilot.email,
    phone: pilot.phone,
    points: pilot.points,
    tier: pilot.tier,
    totalSpent: pilot.totalSpent,
    lifetimeValue: pilot.totalSpent,
    orderCount: pilot.orderCount,
    avgOrderValue: pilot.avgOrderValue,
    segment: pilot.segment,
    preferredCategories: pilot.preferredCategories,
    preferredProducts: pilot.preferredProducts,
    priceRange: pilot.priceRange,
    customTags: pilot.customTags,
    source: 'pilot_seed',
    loyaltyEnrolledAt: enrolledAt,
    createdAt: enrolledAt,
    updatedAt: now,
    isPilotCustomer: true,
  });
  writeCount++;

  // Loyalty transactions
  const purchases = generatePurchaseHistory(pilot);
  for (const purchase of purchases) {
    const txRef = db.collection('loyalty_transactions').doc(purchase.orderId);
    batch.set(txRef, purchase);
    writeCount++;
  }

  // CRM note tagging as pilot
  const noteRef = db.collection('customers').doc(pilot.id).collection('crm_notes').doc('pilot_tag');
  batch.set(noteRef, {
    body: `Pilot test customer — internal controlled testing environment. Use for loyalty card, SMS, email, and segmentation testing. Email: ${pilot.email}`,
    createdAt: now,
    authorId: 'system',
    authorName: 'BakedBot Seed',
    isPilot: true,
  });
  writeCount++;

  console.log(`✅ Queued ${pilot.firstName} ${pilot.lastName} (${pilot.email}) — ${pilot.tier} / ${pilot.points} pts / ${purchases.length} orders`);
}

// Commit in chunks of 500
console.log(`\n📝 Committing ${writeCount} writes...`);
await batch.commit();

// Enroll in playbooks (separate batch — playbook_enrollments collection)
const enrollBatch = db.batch();
const enrollableByTier = {
  silver: [PLAYBOOK_IDS.welcome, PLAYBOOK_IDS.weeklyEmail],
  gold:   [PLAYBOOK_IDS.welcome, PLAYBOOK_IDS.weeklyEmail],
  platinum: [PLAYBOOK_IDS.welcome, PLAYBOOK_IDS.weeklyEmail, PLAYBOOK_IDS.competitive],
};

for (const pilot of PILOTS) {
  const playbookIds = enrollableByTier[pilot.tier] || [PLAYBOOK_IDS.welcome];
  for (const playbookId of playbookIds) {
    const enrollRef = db.collection('playbook_enrollments').doc(`${playbookId}_${pilot.id}`);
    enrollBatch.set(enrollRef, {
      playbookId,
      customerId: pilot.id,
      orgId: ORG_ID,
      email: pilot.email,
      enrolledAt: Timestamp.now(),
      status: 'active',
      source: 'pilot_seed',
    });
  }
}

await enrollBatch.commit();

console.log('\n🎉 Pilot customers seeded successfully!');
console.log('\nTest the wallet at: https://bakedbot.ai/thrivesyracuse/rewards');
console.log('Try these emails:');
PILOTS.forEach(p => console.log(`  ${p.email}  →  ${p.tier} / ${p.points} pts`));
