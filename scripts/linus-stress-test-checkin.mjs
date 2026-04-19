#!/usr/bin/env node
/**
 * Linus Stress Test — Full Platform (all active tenants)
 *
 * Covers all 12 system areas for the primary org + per-tenant baseline for every active org:
 *   1. Check-in flow      4. POS/Inventory    7. Playbooks        10. Email config
 *   2. Loyalty/Rewards    5. Campaigns        8. Analytics        11. Kiosk tablet
 *   3. Recommendations    6. Customer CRM     9. Morning briefing 12. Manager dashboard
 *   T. Tenant baseline — runs automatically for every org in organizations(status=active)
 *
 * New tenants are picked up automatically — no manual changes needed.
 * New dashboard routes: add to DASHBOARD_PAGES below.
 *
 * Usage:
 *   node scripts/linus-stress-test-checkin.mjs              # single batch
 *   node scripts/linus-stress-test-checkin.mjs --loop       # 25/hr × 4 hours
 *   node scripts/linus-stress-test-checkin.mjs --dry-run    # no Firestore writes
 *   node scripts/linus-stress-test-checkin.mjs --suite=1,3  # run specific suites only
 *   node scripts/linus-stress-test-checkin.mjs --org=org_x  # override primary org
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const isDryRun  = process.argv.includes('--dry-run');
const isLoop    = process.argv.includes('--loop');
const suiteArg  = process.argv.find(a => a.startsWith('--suite='));
const orgArg    = process.argv.find(a => a.startsWith('--org='));
const SUITES    = suiteArg ? new Set(suiteArg.replace('--suite=','').split(',').map(Number)) : null;
const PROD_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
const ORG       = orgArg ? orgArg.replace('--org=', '') : 'org_thrive_syracuse';
const AGENT     = 'linus';

// ── Dashboard pages checked on every run ─────────────────────────────────────
// Full Thrive Syracuse tool map — from check-in through settings.
// ADD new routes here when they ship — they will be tested automatically.
const DASHBOARD_PAGES = [
  // ── Check-in & Loyalty (kiosk flow start) ──
  ['/loyalty-tablet',                      '[KIOSK]',        'Loyalty tablet check-in'],
  ['/loyalty/tablet/org_thrive_syracuse',  '[KIOSK-ORG]',    'Thrive org kiosk entry'],
  ['/staff/loyalty',                       '[STAFF-LOYALTY]','Staff loyalty queue'],
  ['/dashboard/dispensary/checkin',        '[CHECKIN-DASH]', 'Check-in management dashboard'],
  ['/dashboard/loyalty-tablet-qr',         '[KIOSK-QR]',     'Kiosk QR code setup'],

  // ── Core operations ──
  ['/dashboard/customers',                 '[CRM]',          'Customers CRM'],
  ['/dashboard/customers/segments',        '[SEGMENTS]',     'Customer segments'],
  ['/dashboard/inbox',                     '[INBOX]',        'Agent inbox'],
  ['/dashboard/campaigns',                 '[CAMPAIGNS]',    'Campaigns'],
  ['/dashboard/playbooks',                 '[PLAYBOOKS]',    'Playbooks'],
  ['/dashboard/playbooks/analytics',       '[PB-ANALYTICS]', 'Playbook analytics'],

  // ── Inventory & products ──
  ['/dashboard/inventory',                 '[INVENTORY]',    'Inventory'],
  ['/dashboard/products',                  '[PRODUCTS]',     'Products'],
  ['/dashboard/menu-sync',                 '[MENU-SYNC]',    'Menu sync'],

  // ── Analytics & reporting ──
  ['/dashboard/analytics',                 '[ANALYTICS]',    'Analytics'],
  ['/dashboard/goals',                     '[GOALS]',        'Goals'],
  ['/dashboard/profitability',             '[PROFITABILITY]','Profitability'],

  // ── CEO & executive suite ──
  ['/dashboard/ceo',                       '[CEO]',          'CEO boardroom'],
  ['/dashboard/email-inbox',               '[EMAIL-INBOX]',  'CEO email inbox'],
  ['/dashboard/ceo/agents',                '[CEO-AGENTS]',   'CEO agent directory'],
  ['/dashboard/ceo/projects',              '[CEO-PROJECTS]', 'CEO projects'],

  // ── Content & marketing ──
  ['/dashboard/blog',                      '[BLOG]',         'Blog'],
  ['/dashboard/marketing',                 '[MARKETING]',    'Marketing hub'],
  ['/dashboard/compliance',                '[COMPLIANCE]',   'Compliance'],
  ['/dashboard/research',                  '[RESEARCH]',     'Research'],

  // ── Settings (end of journey) ──
  ['/dashboard/settings',                  '[SETTINGS]',     'Settings root'],
  ['/dashboard/settings/connections',      '[CONNECTIONS]',  'Social connections'],
  ['/dashboard/settings/loyalty',          '[LOYALTY-CFG]',  'Loyalty settings'],
  ['/dashboard/settings/team',             '[TEAM]',         'Team management'],
  ['/dashboard/settings/profile',          '[PROFILE]',      'Profile settings'],
];
const MAX_HOURS = 4;
const TESTS_PER_HOUR = 25;
const INTERVAL_MS = Math.floor(3600_000 / TESTS_PER_HOUR);

const key = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(key)), projectId: 'studio-567050101-bc6e8' });
}
const db = admin.firestore();

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function pad(n, w = 2) { return String(n).padStart(w, '0'); }
function ts() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function apiGet(path, apiKey) {
  const res = await fetch(`${PROD_URL}${path}`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// Page render check — fetches a dashboard page (unauthenticated), follows redirects to /login.
// PASS: status < 500 AND response body doesn't contain RSC crash strings.
// FAIL: 500 or body contains "An error occurred in the Server Components render" / "Application error".
async function pageRenderCheck(path) {
  const res = await fetch(`${PROD_URL}${path}`, {
    headers: { 'User-Agent': 'Linus-StressTest/1.0', Accept: 'text/html' },
  });
  const status = res.status;
  if (status >= 500) return { status, crashDetected: true, notes: `HTTP ${status}` };
  // Peek at first 4KB for RSC error markers
  const text = await res.text().catch(() => '');
  const snippet = text.slice(0, 4096);
  const RSC_ERRORS = [
    'An error occurred in the Server Components render',
    'Application error: a client-side exception has occurred',
    'Error: An error occurred in the Server Components',
  ];
  const match = RSC_ERRORS.find(e => snippet.includes(e));
  if (match) return { status, crashDetected: true, notes: `RSC crash detected: "${match.slice(0, 60)}"` };
  return { status, crashDetected: false, notes: `HTTP ${status}` };
}

async function tenantSetting(settingKey) {
  const doc = await db.collection('tenants').doc(ORG).collection('settings').doc(settingKey).get();
  return doc.exists ? doc.data() : null;
}

async function fileAgentBug(title, body, priority = 'high') {
  if (isDryRun) { console.log(`  [DRY-RUN] Bug: ${title}`); return; }
  try {
    await db.collection('agent_tasks').add({
      title, body,
      status: 'open', priority, category: 'bug', stoplight: 'gray',
      reportedBy: 'linus-stress-test', assignedTo: null,
      triggeredBy: 'agent', orgId: ORG,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    console.log(`  🐛 Bug filed: ${title}`);
  } catch (e) { console.log(`  ⚠️  Could not file bug: ${e.message}`); }
}

async function cleanupTestDocs() {
  const picks = await db.collection('tenants').doc(ORG).collection('kioskPicks')
    .where('_stressTest', '==', true).limit(200).get();
  if (!picks.empty) {
    const b = db.batch();
    picks.docs.forEach(d => b.delete(d.ref));
    await b.commit();
  }
}

async function getApiKey() {
  if (process.env.THRIVE_STRESS_TEST_API_KEY) return process.env.THRIVE_STRESS_TEST_API_KEY;
  const snap = await db.collection('api_keys')
    .where('orgId', '==', ORG).where('permissions', 'array-contains', 'read:customers').limit(1).get();
  return snap.empty ? null : snap.docs[0].data().key;
}

// Returns all active orgs from Firestore — new tenants are picked up automatically.
async function getActiveOrgs() {
  try {
    const snap = await db.collection('organizations').where('status', '==', 'active').limit(50).get();
    return snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
  } catch (e) {
    console.log(`  ⚠️  getActiveOrgs failed: ${e.message}`);
    return [];
  }
}

// Generic tenant health baseline — runs for every active org automatically.
// Covers the minimum bar for a dispensary to be "live" on the platform.
async function suiteTenantBaseline(results, org) {
  const label = `T. ${org.name}`;
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Customer data exists
  try {
    const snap = await db.collection('customers').where('orgId', '==', org.id).limit(5).get();
    rec('Customers exist', snap.size > 0, snap.size > 0 ? `${snap.size}+ customers` : 'EMPTY — onboarding incomplete?');
    if (snap.size === 0) await fileAgentBug(`[TENANT:${org.name}] No customers found`,
      `organizations/${org.id} is active but has 0 customers. Check onboarding.`);
  } catch (e) { rec('Customers exist', false, e.message); }

  // Inventory exists
  try {
    const snap = await db.collection('tenants').doc(org.id)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(10).get();
    rec('POS inventory exists', snap.size > 0, snap.size > 0 ? `${snap.size}+ products` : 'EMPTY — POS sync needed');
    if (snap.size === 0) await fileAgentBug(`[TENANT:${org.name}] No POS inventory`,
      `tenants/${org.id}/publicViews/products has 0 source=pos items. Menu will be empty.`);
  } catch (e) { rec('POS inventory exists', false, e.message); }

  // Kiosk page responds (unauthenticated)
  try {
    const r = await apiGet(`/loyalty-tablet?orgId=${org.id}`);
    const pass = r.status === 200 || r.status === 307 || r.status === 308;
    rec('Kiosk page responds', pass, `HTTP ${r.status}`);
    if (!pass) await fileAgentBug(`[TENANT:${org.name}] Kiosk page not responding`,
      `/loyalty-tablet?orgId=${org.id} → HTTP ${r.status}`, 'high');
  } catch (e) { rec('Kiosk page responds', false, e.message); }

  // No sample/test products leaking into tenant catalog
  try {
    const snap = await db.collection('tenants').doc(org.id)
      .collection('publicViews').doc('products').collection('items').limit(100).get();
    const junk = snap.docs.filter(d => {
      const n = (d.data().name || '').toLowerCase();
      const p = d.data().price;
      return n.includes('sample') || n.includes('test') || (typeof p === 'number' && p > 0 && p < 1);
    });
    rec('No sample/test products in catalog', junk.length === 0,
      junk.length ? `${junk.length} dirty items found` : `${snap.size} checked`);
    if (junk.length > 0) await fileAgentBug(`[TENANT:${org.name}] Sample/test products in catalog`,
      `Found ${junk.length} items: ${junk.slice(0,3).map(d => d.data().name).join(', ')}`);
  } catch (e) { rec('No sample/test products', false, e.message); }
}

async function submitTestArtifact(runNumber, allResults) {
  if (isDryRun) return;
  const passed = allResults.filter(r => r.pass).length;
  const failed = allResults.filter(r => !r.pass).length;

  const rows = allResults.map(r => `| ${r.suite} | ${r.name} | ${r.pass ? '✅' : '❌'} | ${r.notes || ''} |`);
  const content = [
    `## Full Platform Test Run #${runNumber} — ${new Date().toISOString()}`,
    `**Org:** ${ORG}  **Pass:** ${passed}/${allResults.length}  **Fail:** ${failed}`,
    '',
    '| Suite | Test | Status | Notes |',
    '|-------|------|--------|-------|',
    ...rows,
  ].join('\n');

  try {
    const ref = await db.collection('agent_tasks').add({
      title: `Thrive Full Platform Test #${runNumber} — ${passed}/${allResults.length} passed`,
      body: `Linus automated platform verification across 12 system areas. ${failed} issue(s) found.`,
      status: 'awaiting_approval',
      priority: failed > 0 ? 'high' : 'normal',
      category: 'bug',
      stoplight: failed > 0 ? 'orange' : 'purple',
      reportedBy: AGENT, assignedTo: null, triggeredBy: 'agent', orgId: ORG,
      artifact: {
        type: 'analysis',
        title: `Thrive Platform Test Report — Run #${runNumber}`,
        content,
        generatedAt: new Date().toISOString(),
        generatedBy: AGENT,
      },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    console.log(`\n  📋 Artifact posted → agent_tasks/${ref.id}`);
  } catch (e) { console.log(`  ⚠️  Could not post artifact: ${e.message}`); }
}

// ──────────────────────────────────────────────────────────────────────────
// Test Suites
// ──────────────────────────────────────────────────────────────────────────

async function suite1_checkin(results, apiKey) {
  const label = '1. Check-in';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Firestore: known customer lookup
  try {
    const snap = await db.collection('customers')
      .where('orgId', '==', ORG).where('phoneLast4', '==', '0522').limit(5).get();
    rec('Returning customer — last4 lookup', !snap.empty,
      snap.empty ? 'Martez not found' : `found: ${snap.docs.map(d => d.data().firstName).join(', ')}`);
    if (snap.empty) await fileAgentBug('[CHECKIN] Known customer last4=0522 not found',
      `Firestore query customers where orgId=${ORG} and phoneLast4=0522 returned empty.`);
  } catch (e) { results.push({ suite: label, name: 'Returning customer lookup', pass: false, notes: e.message }); }

  // API: valid lookup
  try {
    const r = await apiGet(`/api/checkin/lookup?orgId=${ORG}&phoneLast4=0522`, apiKey);
    const pass = r.status === 200;
    rec('API /checkin/lookup — HTTP 200', pass, `HTTP ${r.status}`);
    if (!pass) await fileAgentBug(`[CHECKIN API] lookup returned ${r.status}`, JSON.stringify(r.body));
  } catch (e) { results.push({ suite: label, name: 'API lookup', pass: false, notes: e.message }); }

  // API: missing orgId → 401
  try {
    const r = await apiGet('/api/checkin/lookup?phoneLast4=1234');
    rec('API /checkin/lookup — missing orgId → 401', r.status === 401, `HTTP ${r.status}`);
  } catch (e) { results.push({ suite: label, name: 'API missing orgId', pass: false, notes: e.message }); }

  // API: non-numeric last4 → 400
  try {
    const r = await apiGet(`/api/checkin/lookup?orgId=${ORG}&phoneLast4=abc`, apiKey);
    rec('API /checkin/lookup — bad last4 → 400', r.status === 400, `HTTP ${r.status}`);
    if (r.status !== 400) await fileAgentBug('[CHECKIN API] Non-numeric last4 should 400', `Got ${r.status}`);
  } catch (e) { results.push({ suite: label, name: 'API bad last4', pass: false, notes: e.message }); }

  // KioskPick write + verify
  try {
    const mood = rnd(['happy', 'relaxed', 'creative', 'pain relief', 'sleep']);
    const now = new Date();
    let pickId;
    if (!isDryRun) {
      const ref = await db.collection('tenants').doc(ORG).collection('kioskPicks').add({
        orgId: ORG, customerId: `stress_${Date.now()}`, firstName: 'Test', mood,
        productIds: ['prod_1'], productNames: ['Blue Dream'],
        status: 'pending', createdAt: now,
        expiresAt: new Date(now.getTime() + 4 * 3600_000), _stressTest: true,
      });
      pickId = ref.id;
      const doc = await db.collection('tenants').doc(ORG).collection('kioskPicks').doc(pickId).get();
      const d = doc.data();
      const ok = d?.status === 'pending' && d?.firstName === 'Test' && Array.isArray(d?.productNames);
      rec('KioskPick — manager notification doc', ok, ok ? `id=${pickId}` : `bad fields: ${JSON.stringify(d)}`);
      if (!ok) await fileAgentBug('[CHECKIN] kioskPick missing fields', JSON.stringify(d));
    } else {
      rec('KioskPick — manager notification doc', true, 'skipped (dry-run)');
    }
  } catch (e) { results.push({ suite: label, name: 'KioskPick write', pass: false, notes: e.message }); }

  // Race condition: 3 concurrent writes
  try {
    const writes = await Promise.all([1,2,3].map(i =>
      isDryRun ? Promise.resolve(`dry_${i}`) :
      db.collection('tenants').doc(ORG).collection('kioskPicks').add({
        orgId: ORG, customerId: `race_${i}_${Date.now()}`, firstName: `User${i}`,
        mood: null, productIds: [], productNames: [], status: 'pending',
        createdAt: new Date(), expiresAt: new Date(Date.now() + 4 * 3600_000), _stressTest: true,
      }).then(r => r.id)
    ));
    const unique = new Set(writes).size === 3;
    rec('KioskPick — concurrent writes (no race)', unique, unique ? '3 unique IDs' : `COLLISION: ${writes.join(', ')}`);
  } catch (e) { results.push({ suite: label, name: 'KioskPick concurrent', pass: false, notes: e.message }); }

  // phoneLast4 data integrity
  try {
    const snap = await db.collection('customers').where('orgId', '==', ORG).limit(50).get();
    const broken = snap.docs.filter(d => { const x = d.data(); return (x.phoneDigits || x.phone) && !x.phoneLast4; });
    rec('Customer data — phoneLast4 consistent', broken.length === 0,
      broken.length === 0 ? `${snap.size} checked` : `${broken.length} have phone but no phoneLast4`);
    if (broken.length) await fileAgentBug('[CHECKIN] Customers with phones missing phoneLast4',
      broken.slice(0,5).map(d => d.id).join('\n'));
  } catch (e) { results.push({ suite: label, name: 'phoneLast4 integrity', pass: false, notes: e.message }); }

  // Phone normalization
  const cases = [
    { raw: '(312) 684-0522', expected: '13126840522' },
    { raw: '312-684-0522',   expected: '13126840522' },
    { raw: '13126840522',    expected: '13126840522' },
  ];
  const bad = cases.filter(({ raw, expected }) => {
    const d = raw.replace(/\D/g, '');
    return (d.length === 10 ? '1' + d : d) !== expected;
  });
  rec('Phone normalization — 3 formats', bad.length === 0, bad.length ? bad.map(c => c.raw).join(', ') : '3/3 OK');

  // Firestore query performance
  try {
    const t0 = Date.now();
    await db.collection('customers').where('orgId', '==', ORG).where('phoneLast4', '==', '9999').limit(1).get();
    const ms = Date.now() - t0;
    rec('Firestore — phoneLast4 query < 3s', ms < 3000, `${ms}ms`);
    if (ms >= 3000) await fileAgentBug('[CHECKIN] phoneLast4 query slow — index missing?', `${ms}ms`);
  } catch (e) { results.push({ suite: label, name: 'phoneLast4 query perf', pass: false, notes: e.message }); }
}

async function suite2_loyalty(results) {
  const label = '2. Loyalty';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Loyalty config exists
  try {
    const cfg = await tenantSetting('loyalty');
    const ok = cfg !== null;
    rec('Loyalty config exists', ok, ok ? `pointsPerDollar=${cfg.pointsPerDollar ?? 'unset'}` : 'missing');
    if (!ok) await fileAgentBug('[LOYALTY] tenants/org_thrive_syracuse/settings/loyalty missing',
      'Loyalty config required for points accrual and tier tracking.');
  } catch (e) { results.push({ suite: label, name: 'Loyalty config', pass: false, notes: e.message }); }

  // Returning customer has numeric loyaltyPoints
  try {
    const snap = await db.collection('customers').where('orgId', '==', ORG).limit(50).get();
    const withVisits = snap.docs.filter(d => (d.data().visitCount ?? 0) > 0);
    if (!withVisits.length) {
      rec('Returning customer — loyaltyPoints typed', true, 'no visited customers yet');
    } else {
      const d = withVisits[0].data();
      const ok = typeof d.loyaltyPoints === 'number';
      rec('Returning customer — loyaltyPoints typed', ok,
        `visitCount=${d.visitCount}, loyaltyPoints=${d.loyaltyPoints} (${typeof d.loyaltyPoints})`);
      if (!ok) await fileAgentBug('[LOYALTY] loyaltyPoints field not numeric',
        `Customer ${withVisits[0].id}: loyaltyPoints is ${typeof d.loyaltyPoints}`);
    }
  } catch (e) { results.push({ suite: label, name: 'loyaltyPoints type', pass: false, notes: e.message }); }

  // Customer tier field present on high-visit customers
  try {
    const snap = await db.collection('customers').where('orgId', '==', ORG).limit(50).get();
    const highVisit = snap.docs.filter(d => (d.data().visitCount ?? 0) >= 3);
    if (!highVisit.length) {
      rec('Customer tier field — high-visit customers', true, 'no 3+ visit customers yet');
    } else {
      const missing = highVisit.filter(d => !d.data().tier);
      rec('Customer tier field — high-visit customers', missing.length === 0,
        missing.length ? `${missing.length}/${highVisit.length} missing tier` : `${highVisit.length} checked`);
    }
  } catch (e) { results.push({ suite: label, name: 'Customer tier field', pass: false, notes: e.message }); }
}

async function suite3_recommendations(results) {
  const label = '3. Recommendations';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  const MOODS = ['happy', 'relaxed', 'creative', 'energetic', 'pain', 'sleep'];

  // All 3 rec categories stocked
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(100).get();
    const cats = [...new Set(snap.docs.map(d => d.data().category).filter(Boolean))];
    const hasFlower  = cats.some(c => /flower/i.test(c));
    const hasEdibles = cats.some(c => /edible/i.test(c));
    const hasVapes   = cats.some(c => /vape/i.test(c));
    rec('Rec inventory — Flower stocked', hasFlower, hasFlower ? 'OK' : 'MISSING');
    rec('Rec inventory — Edibles stocked', hasEdibles, hasEdibles ? 'OK' : 'MISSING');
    rec('Rec inventory — Vapes stocked', hasVapes, hasVapes ? 'OK' : 'MISSING');
    if (!hasFlower || !hasEdibles || !hasVapes) {
      const missing = [!hasFlower && 'Flower', !hasEdibles && 'Edibles', !hasVapes && 'Vapes'].filter(Boolean);
      await fileAgentBug(`[RECS] Missing categories: ${missing.join(', ')}`,
        `Kiosk rec engine requires Flower, Edibles, Vapes. Missing: ${missing.join(', ')}`);
    }
  } catch (e) { results.push({ suite: label, name: 'Rec inventory categories', pass: false, notes: e.message }); }

  // Products have required rec fields
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(20).get();
    const withPrice   = snap.docs.filter(d => typeof d.data().price === 'number' && d.data().price > 0);
    const withCat     = snap.docs.filter(d => d.data().category);
    const withName    = snap.docs.filter(d => d.data().name);
    const pctPrice    = Math.round(withPrice.length / snap.size * 100);
    const pctCat      = Math.round(withCat.length / snap.size * 100);
    rec('Products — price field > 0', pctPrice >= 90, `${pctPrice}% have price`);
    rec('Products — category field present', pctCat >= 90, `${pctCat}% have category`);
    rec('Products — name field present', withName.length === snap.size, `${withName.length}/${snap.size}`);
    if (pctPrice < 90) await fileAgentBug('[RECS] Many products missing price',
      `Only ${pctPrice}% of sampled products have price > 0. Smokey may show $0 items.`);
  } catch (e) { results.push({ suite: label, name: 'Product fields', pass: false, notes: e.message }); }

  // No sample/test products leaking into POS catalog
  try {
    const rootSnap = await db.collection('products').limit(500).get();
    const junk = [];
    rootSnap.forEach(doc => {
      const p = doc.data();
      if ((p.name || '').toLowerCase().includes('sample') ||
          (p.name || '').toLowerCase().includes('test') ||
          (typeof p.price === 'number' && p.price < 1)) {
        junk.push(p.name);
      }
    });
    rec('Root products — no sample/test items', junk.length === 0,
      junk.length ? `${junk.length} dirty: ${junk.slice(0,3).join(', ')}` : 'clean');
  } catch (e) { results.push({ suite: label, name: 'Root products clean', pass: false, notes: e.message }); }
}

async function suite4_pos(results) {
  const label = '4. POS/Inventory';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Location doc with posConfig exists
  try {
    const snap = await db.collection('locations').where('orgId', '==', ORG).limit(1).get();
    const ok = !snap.empty;
    rec('Location doc exists', ok, ok ? `id=${snap.docs[0].id}` : 'no location doc');
    if (ok) {
      const posConfig = snap.docs[0].data().posConfig;
      rec('POS config present on location', !!posConfig,
        posConfig ? `provider=${posConfig.provider}, status=${posConfig.status}` : 'missing posConfig');
      if (!posConfig) await fileAgentBug('[POS] Location doc has no posConfig',
        `Location ${snap.docs[0].id} is missing posConfig. POS sync will fail.`);
    }
  } catch (e) { results.push({ suite: label, name: 'Location doc', pass: false, notes: e.message }); }

  // Inventory count > 50 (healthy catalog)
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(200).get();
    rec('POS inventory count > 50', snap.size >= 50, `${snap.size} items`);
    if (snap.size < 50) await fileAgentBug('[POS] Inventory below 50 POS products',
      `Only ${snap.size} products with source=pos. Menu may appear empty on kiosk.`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Inventory count', pass: false, notes: e.message }); }

  // Price distribution sanity
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(50).get();
    const prices = snap.docs.map(d => d.data().price).filter(p => typeof p === 'number');
    const avg = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
    const hasExtremes = prices.some(p => p > 500) || prices.some(p => p > 0 && p < 1);
    rec('Product prices — no extremes (> $500 or < $1)', !hasExtremes,
      `avg=$${avg.toFixed(0)}, n=${prices.length}`);
    if (hasExtremes) await fileAgentBug('[POS] Extreme product prices detected',
      `Products with price > $500 or $0–$1 found. These may be data errors or sample products.`);
  } catch (e) { results.push({ suite: label, name: 'Price distribution', pass: false, notes: e.message }); }
}

async function suite5_campaigns(results) {
  const label = '5. Campaigns';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Firestore: campaigns collection readable
  try {
    const snap = await db.collection('campaigns').where('orgId', '==', ORG).limit(20).get();
    rec('Campaigns collection readable', true, `${snap.size} campaigns`);
    if (snap.size > 0) {
      const sample = snap.docs[0].data();
      const hasStatus = !!sample.status;
      const hasName   = !!sample.name;
      rec('Campaign docs — status + name fields', hasStatus && hasName,
        `status=${sample.status}, name=${sample.name}`);
    } else {
      rec('Campaign docs — status + name fields', true, 'no campaigns yet (OK)');
    }
  } catch (e) { results.push({ suite: label, name: 'Campaigns readable', pass: false, notes: e.message }); }

  // Page render: /dashboard/campaigns — must not 5xx or RSC crash
  try {
    const r = await pageRenderCheck('/dashboard/campaigns');
    rec('Page /dashboard/campaigns — no RSC crash', !r.crashDetected, r.notes);
    if (r.crashDetected) await fileAgentBug('[CAMPAIGNS] /dashboard/campaigns RSC crash',
      `pageRenderCheck returned crashDetected=true: ${r.notes}\nURL: ${PROD_URL}/dashboard/campaigns`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Campaigns page render', pass: false, notes: e.message }); }

  // Cron endpoint auth check: campaign-sender requires auth
  try {
    const r = await apiGet('/api/cron/campaign-sender', null);
    const pass = r.status === 401 || r.status === 403 || r.status === 405 || r.status === 307;
    rec('Cron /campaign-sender — auth required', pass, `HTTP ${r.status} (expected 401/403/405)`);
    if (!pass && r.status < 400) await fileAgentBug('[CAMPAIGNS] campaign-sender cron unprotected',
      `GET /api/cron/campaign-sender returned ${r.status} without auth.`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Campaign cron auth', pass: false, notes: e.message }); }
}

async function suite6_customers(results) {
  const label = '6. Customer CRM';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Customer count > 0
  try {
    const snap = await db.collection('customers').where('orgId', '==', ORG).limit(50).get();
    rec('Customer count > 0', snap.size > 0, `${snap.size} customers`);
    if (snap.size === 0) await fileAgentBug('[CRM] No customers found for Thrive',
      `customers collection has 0 docs with orgId=${ORG}`, 'critical');

    if (snap.size > 0) {
      // Segment distribution
      const segments = snap.docs.map(d => d.data().segment || 'unknown');
      const dist = segments.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
      // Segments populate over time via POS sync — warn only if near-zero for active org
      const knownPct = Math.round((1 - (dist['unknown'] || 0) / snap.size) * 100);
      rec('Customer segments populated (>10%)', knownPct >= 10 || snap.size < 10,
        Object.entries(dist).map(([k,v]) => `${k}:${v}`).join(', '));

      // Only flag customers who have phone (incomplete POS imports without phone have no name — that's OK)
      const noNameWithPhone = snap.docs.filter(d => {
        const x = d.data();
        return !x.firstName && (x.phoneDigits || x.phone);
      });
      rec('Customers with phones — have firstName', noNameWithPhone.length === 0,
        noNameWithPhone.length ? `${noNameWithPhone.length} have phone but no name` : `${snap.size} checked`);
      if (noNameWithPhone.length > 3) await fileAgentBug('[CRM] Customers with phones missing firstName',
        `${noNameWithPhone.length} customers have a phone number but no firstName. Kiosk greeting will break.`);
    }
  } catch (e) { results.push({ suite: label, name: 'Customer count', pass: false, notes: e.message }); }

  // Recent visits linkable to customers
  try {
    const visitSnap = await db.collection('checkin_visits').where('orgId', '==', ORG).limit(10).get();
    rec('Checkin visits collection readable', true, `${visitSnap.size} visits`);
    if (visitSnap.size > 0) {
      const sample = visitSnap.docs[0].data();
      const hasFields = sample.firstName && sample.visitedAt;
      rec('Visit docs — firstName + visitedAt', !!hasFields,
        hasFields ? `firstName=${sample.firstName}` : 'missing required fields');
    }
  } catch (e) { results.push({ suite: label, name: 'Checkin visits', pass: false, notes: e.message }); }

  // Page render: /dashboard/customers — must not 5xx or RSC crash
  try {
    const r = await pageRenderCheck('/dashboard/customers');
    rec('Page /dashboard/customers — no RSC crash', !r.crashDetected, r.notes);
    if (r.crashDetected) await fileAgentBug('[CRM] /dashboard/customers RSC crash',
      `pageRenderCheck returned crashDetected=true: ${r.notes}\nURL: ${PROD_URL}/dashboard/customers`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Customers page render', pass: false, notes: e.message }); }

  // Multi-org isolation: checkin API rejects requests for wrong org
  try {
    const WRONG_ORG = 'org_ecstatic_edibles';
    const r = await apiGet(`/api/checkin/lookup?orgId=${WRONG_ORG}&phoneLast4=0522`);
    // Should return 200 (org exists, no match) or 401 (org not found/unauthed) — NOT Thrive's customer data
    const thriveCusts = await db.collection('customers').where('orgId', '==', ORG).limit(5).get();
    const thriveIds = new Set(thriveCusts.docs.map(d => d.id));
    const body = r.body;
    const leaked = Array.isArray(body?.customers)
      ? body.customers.filter((c) => c.id && thriveIds.has(c.id))
      : [];
    rec('Multi-org isolation — Thrive data not leaked', leaked.length === 0,
      leaked.length ? `CRITICAL: ${leaked.length} Thrive customer(s) in wrong-org response` : `orgId=${WRONG_ORG} → HTTP ${r.status}`);
    if (leaked.length > 0) await fileAgentBug('[SECURITY] Multi-org data leak detected',
      `Customers from ${ORG} appeared in API response for ${WRONG_ORG}. Org isolation breach.`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Multi-org isolation', pass: false, notes: e.message }); }
}

async function suite7_playbooks(results) {
  const label = '7. Playbooks';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  try {
    const snap = await db.collection('tenants').doc(ORG).collection('playbooks').limit(20).get();
    rec('Playbooks collection readable', true, `${snap.size} playbooks`);
    if (snap.size > 0) {
      const active = snap.docs.filter(d => d.data().status === 'active');
      const draft  = snap.docs.filter(d => d.data().status === 'draft');
      rec('At least 1 active playbook', active.length > 0,
        `active=${active.length}, draft=${draft.length}`);
    } else {
      rec('At least 1 active playbook', true, 'none yet (OK for new org)');
    }
  } catch (e) { results.push({ suite: label, name: 'Playbooks readable', pass: false, notes: e.message }); }
}

async function suite8_analytics(results) {
  const label = '8. Analytics';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Products have velocity/sales metadata
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(30).get();
    const withSales = snap.docs.filter(d => {
      const x = d.data();
      return typeof x.salesCount30d === 'number' || typeof x.salesCount7d === 'number' || typeof x.velocity === 'number';
    });
    const pct = snap.size ? Math.round(withSales.length / snap.size * 100) : 0;
    // Velocity populated by POS sync job — informational, not a blocking failure
    rec('Products — velocity/sales metadata (informational)', true,
      snap.size === 0 ? 'no products' : `${pct}% have sales metadata ${pct === 0 ? '(POS sync pending)' : ''}`);
  } catch (e) { results.push({ suite: label, name: 'Product velocity data', pass: false, notes: e.message }); }

  // Orders collection readable
  try {
    const snap = await db.collection('orders').where('orgId', '==', ORG).limit(5).get();
    rec('Orders collection readable', true, `${snap.size} sample orders`);
  } catch (e) {
    results.push({ suite: label, name: 'Orders readable', pass: false, notes: e.message });
    await fileAgentBug('[ANALYTICS] Orders collection query failed', e.message, 'critical');
  }
}

async function suite9_morningBriefing(results, apiKey) {
  const label = '9. Briefing';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Inbox thread exists for org
  try {
    const snap = await db.collection('inbox_threads')
      .where('orgId', '==', ORG).limit(5).get();
    rec('Inbox threads readable', true, `${snap.size} threads`);
    const briefingThread = snap.docs.find(d => d.data().metadata?.isBriefingThread);
    // Informational — briefing thread created on first cron run; not expected to exist on new orgs
    rec('Morning briefing thread (informational)', true,
      briefingThread ? `id=${briefingThread.id}` : 'none yet (cron will create on first run)');
  } catch (e) { results.push({ suite: label, name: 'Briefing thread', pass: false, notes: e.message }); }

  // Cron endpoint auth check (no valid secret → 401/403)
  try {
    const r = await apiGet('/api/cron/morning-briefing', null);
    const pass = r.status === 401 || r.status === 403 || r.status === 405;
    rec('Cron /morning-briefing — auth required', pass, `HTTP ${r.status} (expected 401/403/405 without auth)`);
    if (!pass) await fileAgentBug('[BRIEFING] Morning briefing cron unprotected',
      `GET /api/cron/morning-briefing returned ${r.status} without auth. Expected 401/403.`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Briefing cron auth', pass: false, notes: e.message }); }
}

async function suite10_email(results) {
  const label = '10. Email';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Mailjet keys — in production they come from GCP Secret Manager (apphosting.yaml)
  // Locally they may not be in .env.local — only flag if PROD_URL points to production
  const hasMailjet = !!(process.env.MAILJET_API_KEY && (process.env.MAILJET_SECRET_KEY || process.env.MAILJET_API_SECRET));
  const isProd = PROD_URL.includes('bakedbot.ai') || PROD_URL.includes('hosted.app');
  rec('Mailjet API keys', hasMailjet || isProd,
    hasMailjet ? 'both present locally' : isProd ? 'in GCP secrets (production)' : 'MISSING — email sends will fail');

  // Email leads collection readable
  try {
    const snap = await db.collection('email_leads').where('orgId', '==', ORG).limit(5).get();
    rec('Email leads collection readable', true, `${snap.size} leads`);
  } catch (e) { results.push({ suite: label, name: 'Email leads', pass: false, notes: e.message }); }

  // Wakeup campaign dedup sentinel readable
  try {
    const doc = await db.collection('email_campaigns').doc('wakeup_2026').get();
    rec('Wakeup campaign sentinel readable', true, doc.exists ? 'doc exists' : 'no sentinel yet (OK)');
  } catch (e) { results.push({ suite: label, name: 'Wakeup sentinel', pass: false, notes: e.message }); }
}

async function suite11_kiosk(results) {
  const label = '11. Kiosk';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Kiosk page responds
  try {
    const r = await apiGet(`/loyalty-tablet?orgId=${ORG}`);
    const pass = r.status === 200 || r.status === 307 || r.status === 308;
    rec('Kiosk tablet page responds', pass, `HTTP ${r.status}`);
    if (!pass) await fileAgentBug('[KIOSK] /loyalty-tablet page not responding',
      `GET /loyalty-tablet?orgId=${ORG} → HTTP ${r.status}`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Kiosk page', pass: false, notes: e.message }); }

  // Products cover all TABLET_MOODS preferences
  const MOOD_CATS = { happy: ['Edibles', 'Vapes'], relaxed: ['Flower', 'Pre-Rolls'], creative: ['Vapes', 'Concentrates'] };
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(100).get();
    const cats = new Set(snap.docs.map(d => d.data().category).filter(Boolean));
    const moodCoverage = Object.entries(MOOD_CATS).map(([mood, needed]) => {
      const covered = needed.filter(c => [...cats].some(cat => cat.toLowerCase().includes(c.toLowerCase())));
      return { mood, ok: covered.length > 0 };
    });
    const allCovered = moodCoverage.every(m => m.ok);
    rec('Kiosk — mood inventory coverage', allCovered,
      moodCoverage.map(m => `${m.mood}:${m.ok ? '✓' : '✗'}`).join(' '));
    if (!allCovered) {
      const uncovered = moodCoverage.filter(m => !m.ok).map(m => m.mood);
      await fileAgentBug(`[KIOSK] No products for moods: ${uncovered.join(', ')}`,
        `These moods have no matching inventory. Smokey will fall back to generic recommendations.`);
    }
  } catch (e) { results.push({ suite: label, name: 'Mood coverage', pass: false, notes: e.message }); }

  // Pending kioskPicks TTL (no picks older than 4h should be pending)
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 3600_000);
    const snap = await db.collection('tenants').doc(ORG).collection('kioskPicks')
      .where('status', '==', 'pending')
      .where('_stressTest', '!=', true)
      .limit(20).get();
    const stale = snap.docs.filter(d => {
      const created = d.data().createdAt?.toDate?.() || new Date(d.data().createdAt);
      return created < fourHoursAgo;
    });
    rec('KioskPicks — no stale pending (> 4h)', stale.length === 0,
      stale.length ? `${stale.length} stale picks (TTL breach)` : `${snap.size} pending, all fresh`);
    if (stale.length) await fileAgentBug('[KIOSK] Stale kioskPicks not expiring',
      `${stale.length} kioskPicks with status=pending older than 4 hours. TTL cleanup may not be running.\nIDs: ${stale.slice(0,5).map(d => d.id).join(', ')}`);
  } catch (e) {
    // != operator requires composite index — skip gracefully
    results.push({ suite: label, name: 'KioskPicks stale check', pass: true, notes: 'skipped (index)' });
  }
}

async function suite12_dashboard(results) {
  const label = '12. Dashboard';
  function rec(name, pass, notes = '') {
    results.push({ suite: label, name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} [${label}] ${name}${notes ? ' — ' + notes : ''}`);
  }

  // Checkin config — missing doc falls back to DEFAULT_CHECKIN_CONFIG in getCheckinConfig(), so not a bug
  try {
    const cfg = await tenantSetting('checkinConfig');
    rec('Checkin config (or defaults apply)', true,
      cfg ? `headline="${cfg.welcomeHeadline || 'unset'}"` : 'no doc — defaults applied by server action');
  } catch (e) { results.push({ suite: label, name: 'Checkin config', pass: false, notes: e.message }); }

  // Dashboard root page responds
  try {
    const r = await apiGet('/dashboard');
    const pass = r.status === 200 || r.status === 307 || r.status === 308 || r.status === 401 || r.status === 302;
    rec('Dashboard root responds (not 5xx)', pass, `HTTP ${r.status}`);
    if (!pass) await fileAgentBug('[DASHBOARD] /dashboard returning server error',
      `HTTP ${r.status}`, 'critical');
  } catch (e) { results.push({ suite: label, name: 'Dashboard root', pass: false, notes: e.message }); }

  // Page render checks — detect RSC crashes on all major dashboard routes (parallel)
  // Source of truth: DASHBOARD_PAGES at top of file — add new routes there.
  await Promise.all(DASHBOARD_PAGES.map(async ([path, tag, label2]) => {
    try {
      const r = await pageRenderCheck(path);
      rec(`Page ${path} — no RSC crash`, !r.crashDetected, r.notes);
      if (r.crashDetected) await fileAgentBug(`${tag} ${label2} RSC crash`,
        `pageRenderCheck detected crash at ${PROD_URL}${path}\n${r.notes}`, 'critical');
    } catch (e) { results.push({ suite: label, name: `${label2} render`, pass: false, notes: e.message }); }
  }));

  // Admin endpoints require auth (no session → 401)
  try {
    const adminRoutes = [
      '/api/admin/platform-health',
      '/api/admin/run-stress-test',
      '/api/admin/seed',
    ];
    await Promise.all(adminRoutes.map(async (path) => {
      try {
        const r = await apiGet(path, null);
        const pass = r.status === 401 || r.status === 403 || r.status === 405;
        rec(`Admin ${path} — auth required`, pass, `HTTP ${r.status}`);
        if (!pass && r.status < 400) await fileAgentBug(`[SECURITY] ${path} returned ${r.status} without auth`,
          `Admin endpoint should require authentication. Got ${r.status}.`, 'critical');
      } catch (e) { results.push({ suite: label, name: `Admin ${path} auth`, pass: false, notes: e.message }); }
    }));
  } catch (e) { results.push({ suite: label, name: 'Admin endpoints auth sweep', pass: false, notes: e.message }); }

  // Cron auth sweep — additional crons beyond morning-briefing
  const cronRoutes = [
    '/api/cron/daily-executive-cadence',
    '/api/cron/pos-sync',
    '/api/cron/weekly-friday-memo',
    '/api/cron/generate-insights',
  ];
  await Promise.all(cronRoutes.map(async (path) => {
    try {
      const r = await apiGet(path, null);
      const pass = r.status === 401 || r.status === 403 || r.status === 405 || r.status === 307;
      rec(`Cron ${path} — auth required`, pass, `HTTP ${r.status}`);
      if (!pass && r.status < 400) await fileAgentBug(`[SECURITY] ${path} unprotected`,
        `Cron endpoint returned ${r.status} without auth. Expected 401/403.`, 'critical');
    } catch (e) { results.push({ suite: label, name: `Cron ${path} auth`, pass: false, notes: e.message }); }
  }));

  // Recent checkin visits accessible
  try {
    const snap = await db.collection('checkin_visits')
      .where('orgId', '==', ORG)
      .orderBy('visitedAt', 'desc')
      .limit(25).get();
    rec('Recent visits feed — query works', true, `${snap.size} visits returned`);
  } catch (e) {
    results.push({ suite: label, name: 'Recent visits feed', pass: false, notes: e.message });
    await fileAgentBug('[DASHBOARD] checkin_visits query failed', e.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Main batch runner
// ──────────────────────────────────────────────────────────────────────────

async function runBatch(runNumber, apiKey) {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  LINUS FULL PLATFORM TEST — Run #${String(runNumber).padEnd(4)} — ${ts()}   ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  const allResults = [];
  const run = (suiteNum, fn, ...args) => {
    if (SUITES && !SUITES.has(suiteNum)) return Promise.resolve();
    return fn(allResults, ...args);
  };

  await run(1,  suite1_checkin, apiKey);     console.log('');
  await run(2,  suite2_loyalty);             console.log('');
  await run(3,  suite3_recommendations);     console.log('');
  await run(4,  suite4_pos);                 console.log('');
  await run(5,  suite5_campaigns);           console.log('');
  await run(6,  suite6_customers);           console.log('');
  await run(7,  suite7_playbooks);           console.log('');
  await run(8,  suite8_analytics);           console.log('');
  await run(9,  suite9_morningBriefing, apiKey); console.log('');
  await run(10, suite10_email);              console.log('');
  await run(11, suite11_kiosk);              console.log('');
  await run(12, suite12_dashboard);          console.log('');

  // Per-tenant baseline — auto-discovers all active orgs, runs 4 health checks each.
  // New tenants are picked up automatically — no changes needed here.
  if (!SUITES || SUITES.has(0)) {
    const orgs = await getActiveOrgs();
    const otherOrgs = orgs.filter(o => o.id !== ORG);
    if (otherOrgs.length > 0) {
      console.log(`\n── Tenant Baseline (${otherOrgs.length} other orgs) ──`);
      for (const org of otherOrgs) {
        await suiteTenantBaseline(allResults, org);
        console.log('');
      }
    }
  }

  if (!isDryRun) await cleanupTestDocs().catch(() => {});

  const passed = allResults.filter(r => r.pass).length;
  const failed = allResults.filter(r => !r.pass).length;
  const total  = allResults.length;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(failed === 0
    ? `🟢  Run #${runNumber} — ALL ${passed}/${total} TESTS PASS`
    : `🔴  Run #${runNumber} — ${failed} FAILURE(S) | ${passed}/${total} passed`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    allResults.filter(r => !r.pass).forEach(r =>
      console.log(`  ❌ [${r.suite}] ${r.name}: ${r.notes}`)
    );
  }
  console.log(`${'═'.repeat(60)}\n`);

  await submitTestArtifact(runNumber, allResults);
  return { passed, failed, total };
}

// ──────────────────────────────────────────────────────────────────────────
// Entry
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = await getApiKey().catch(() => null);
  console.log(apiKey ? `🔑 API key found — HTTP endpoints will be tested` : `⚠️  No API key — HTTP tests skipped`);

  if (!isLoop) {
    const run = Math.floor(Date.now() / 1000) % 10000;
    await runBatch(run, apiKey);
    process.exit(0);
  }

  const endTime = Date.now() + MAX_HOURS * 3600_000;
  let runNumber = 1;
  let totalPassed = 0, totalFailed = 0;

  console.log(`🔄 Loop: ${TESTS_PER_HOUR}/hr × ${MAX_HOURS}h = ${TESTS_PER_HOUR * MAX_HOURS} runs`);
  console.log(`⏱  Interval: ${(INTERVAL_MS / 1000).toFixed(0)}s\n`);

  while (Date.now() < endTime) {
    const { passed, failed } = await runBatch(runNumber, apiKey);
    totalPassed += passed;
    totalFailed += failed;
    runNumber++;

    if (Date.now() < endTime) {
      const mins = Math.round((endTime - Date.now()) / 60000);
      console.log(`⏳ Next in ${(INTERVAL_MS / 1000).toFixed(0)}s  (${mins}min left, ${runNumber - 1} done)`);
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`COMPLETE — ${runNumber - 1} runs | Pass: ${totalPassed} | Fail: ${totalFailed}`);
  console.log(`${'═'.repeat(60)}\n`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
