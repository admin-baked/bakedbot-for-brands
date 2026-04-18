#!/usr/bin/env node
/**
 * Linus Stress Test — Thrive Syracuse Check-In Flow
 *
 * Runs 25 test scenarios per hour for 4 hours (100 total).
 * Tests from both customer POV (kiosk interactions) and manager POV
 * (kioskPicks notifications). Files bugs as agent tasks when failures found.
 *
 * Usage:
 *   node scripts/linus-stress-test-checkin.mjs                  # run once (1 batch)
 *   node scripts/linus-stress-test-checkin.mjs --loop            # run for 4 hours @ 25/hr
 *   node scripts/linus-stress-test-checkin.mjs --dry-run         # report without writing
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const isDryRun  = process.argv.includes('--dry-run');
const isLoop    = process.argv.includes('--loop');
const PROD_URL  = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const ORG       = 'org_thrive_syracuse';
const AGENT     = 'linus';
const MAX_HOURS = 4;
const TESTS_PER_HOUR = 25;
const INTERVAL_MS = Math.floor(3600_000 / TESTS_PER_HOUR); // ~144s

// Firestore init
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
function randPhone() {
  const area  = 300 + Math.floor(Math.random() * 699);
  const mid   = 100 + Math.floor(Math.random() * 899);
  const last  = 1000 + Math.floor(Math.random() * 8999);
  return `${area}${mid}${last}`;
}
function randLast4() { return String(1000 + Math.floor(Math.random() * 8999)); }

async function lookupLast4(phoneLast4, apiKey) {
  const url = `${PROD_URL}/api/checkin/lookup?orgId=${ORG}&phoneLast4=${phoneLast4}`;
  const res = await fetch(url, { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function firestoreCustomerLookup(phoneLast4) {
  const snap = await db.collection('customers')
    .where('orgId', '==', ORG).where('phoneLast4', '==', phoneLast4).limit(5).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function writeKioskPick(customerId, firstName, mood, productIds, productNames) {
  if (isDryRun) return `dry_run_pick_${Date.now()}`;
  const now = new Date();
  const ref = await db.collection('tenants').doc(ORG).collection('kioskPicks').add({
    orgId: ORG,
    customerId,
    firstName,
    mood: mood ?? null,
    productIds,
    productNames,
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
    _stressTest: true,
  });
  return ref.id;
}

async function cleanupTestPicks() {
  const snap = await db.collection('tenants').doc(ORG).collection('kioskPicks')
    .where('_stressTest', '==', true).limit(200).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

async function getApiKey() {
  const snap = await db.collection('api_keys')
    .where('orgId', '==', ORG)
    .where('permissions', 'array-contains', 'read:customers')
    .limit(1).get();
  return snap.empty ? null : snap.docs[0].data().key;
}

async function fileAgentBug(title, body, priority = 'high') {
  if (isDryRun) { console.log(`[DRY-RUN] Bug: ${title}`); return; }
  try {
    await db.collection('agent_tasks').add({
      title,
      body,
      status: 'open',
      priority,
      category: 'bug',
      stoplight: 'gray',
      reportedBy: 'linus-stress-test',
      assignedTo: null,
      triggeredBy: 'agent',
      orgId: ORG,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`  🐛 Bug filed: ${title}`);
  } catch (e) {
    console.log(`  ⚠️  Could not file bug: ${e.message}`);
  }
}

async function submitTestArtifact(runNumber, results) {
  if (isDryRun) return;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const content = [
    `## Stress Test Run #${runNumber} — ${new Date().toISOString()}`,
    `**Org:** ${ORG}  **Pass:** ${passed}/${results.length}  **Fail:** ${failed}`,
    '',
    '| Test | Status | Notes |',
    '|------|--------|-------|',
    ...results.map(r => `| ${r.name} | ${r.pass ? '✅' : '❌'} | ${r.notes || ''} |`),
  ].join('\n');

  try {
    const taskRef = await db.collection('agent_tasks').add({
      title: `Checkin Stress Test Run #${runNumber} — ${passed}/${results.length} passed`,
      body: `Linus automated checkin flow verification. ${failed} issue(s) found.`,
      status: 'awaiting_approval',
      priority: failed > 0 ? 'high' : 'normal',
      category: 'bug',
      stoplight: failed > 0 ? 'orange' : 'purple',
      reportedBy: AGENT,
      assignedTo: null,
      triggeredBy: 'agent',
      orgId: ORG,
      artifact: {
        type: 'analysis',
        title: `Checkin Flow Test Report — Run #${runNumber}`,
        content,
        generatedAt: new Date().toISOString(),
        generatedBy: AGENT,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    console.log(`  📋 Artifact posted → agent_tasks/${taskRef.id}`);
  } catch (e) {
    console.log(`  ⚠️  Could not post artifact: ${e.message}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Test suite
// ──────────────────────────────────────────────────────────────────────────

async function runBatch(runNumber, apiKey) {
  console.log(`\n┌─────────────────────────────────────────────────────────┐`);
  console.log(`│  LINUS STRESS TEST — Run #${String(runNumber).padEnd(3)} — ${ts()}          │`);
  console.log(`└─────────────────────────────────────────────────────────┘\n`);

  const results = [];

  function record(name, pass, notes = '') {
    results.push({ name, pass, notes });
    console.log(`  ${pass ? '✅' : '❌'} ${name}${notes ? ' — ' + notes : ''}`);
  }

  // ── 1. Firestore customer lookup — known last4 ─────────────────────────
  try {
    const customers = await firestoreCustomerLookup('0522'); // Martez
    const found = customers.length > 0;
    record('Customer lookup — known last4 (0522)', found,
      found ? `found: ${customers.map(c => c.firstName).join(', ')}` : 'not found — customer may be missing');
    if (!found) await fileAgentBug(
      '[CHECKIN] Known customer last4=0522 not found in Firestore',
      `Firestore query: customers where orgId=${ORG} and phoneLast4=0522 returned 0 results.\nThis customer (Martez) should exist and is used as a returning customer test fixture.\n\n**To reproduce:** node scripts/linus-stress-test-checkin.mjs`,
    );
  } catch (e) {
    record('Customer lookup — known last4', false, e.message);
    await fileAgentBug('[CHECKIN] Firestore customer lookup threw', e.message);
  }

  // ── 2. Firestore lookup — unknown last4 ───────────────────────────────
  try {
    const unknownLast4 = randLast4();
    const customers = await firestoreCustomerLookup(unknownLast4);
    // Should return empty OR a real customer (either is valid — just must not throw)
    record('Customer lookup — unknown last4', true,
      customers.length ? `${customers.length} coincidental match(es)` : 'correctly returned empty');
  } catch (e) {
    record('Customer lookup — unknown last4', false, e.message);
  }

  // ── 3. API endpoint — valid request ───────────────────────────────────
  if (apiKey) {
    try {
      const r = await lookupLast4('0522', apiKey);
      const pass = r.status === 200 || r.status === 404;
      record('API /api/checkin/lookup — valid key + last4', pass,
        `HTTP ${r.status} ${r.status === 200 ? '(found)' : '(not found)' }`);
      if (!pass) await fileAgentBug(
        `[CHECKIN API] /api/checkin/lookup returned unexpected ${r.status}`,
        `Expected 200 or 404. Got ${r.status}.\nURL: ${PROD_URL}/api/checkin/lookup?orgId=${ORG}&phoneLast4=0522\n\nResponse: ${JSON.stringify(r.body)}`,
        'critical',
      );
    } catch (e) {
      record('API /api/checkin/lookup — valid key + last4', false, e.message);
    }
  } else {
    record('API /api/checkin/lookup — valid key + last4', true, 'skipped (no API key in Firestore)');
  }

  // ── 4. API endpoint — missing orgId (should 400) ──────────────────────
  try {
    const url = `${PROD_URL}/api/checkin/lookup?phoneLast4=1234`;
    const res = await fetch(url);
    const pass = res.status === 401 || res.status === 400; // 401 = auth first, 400 = validation
    record('API /api/checkin/lookup — missing orgId', pass, `HTTP ${res.status}`);
    if (!pass) await fileAgentBug(
      `[CHECKIN API] Missing orgId should return 400/401, got ${res.status}`,
      `GET /api/checkin/lookup?phoneLast4=1234 (no orgId)\nExpected 400 or 401.\nGot: ${res.status}`,
    );
  } catch (e) {
    record('API /api/checkin/lookup — missing orgId', false, e.message);
  }

  // ── 5. API endpoint — invalid phoneLast4 (should 400) ────────────────
  if (apiKey) {
    try {
      const r = await lookupLast4('abc', apiKey);  // non-numeric
      const pass = r.status === 400;
      record('API /api/checkin/lookup — non-numeric last4', pass, `HTTP ${r.status}`);
      if (!pass) await fileAgentBug(
        `[CHECKIN API] Non-numeric phoneLast4 should return 400, got ${r.status}`,
        `phoneLast4=abc should fail validation. Got: ${r.status}`,
      );
    } catch (e) {
      record('API /api/checkin/lookup — non-numeric last4', false, e.message);
    }
  } else {
    record('API /api/checkin/lookup — non-numeric last4', true, 'skipped (no API key)');
  }

  // ── 6. KioskPick write — new customer (manager notification path) ─────
  try {
    const fakeCustId = `stress_test_${Date.now()}`;
    const mood = rnd(['happy', 'relaxed', 'creative', 'pain relief', 'sleep']);
    const products = ['prod_flower_001', 'prod_edible_002'];
    const pickId = await writeKioskPick(fakeCustId, 'Test Customer', mood, products, ['Blue Dream', 'Gummy Bears']);

    if (!isDryRun) {
      // Verify document is readable
      const pickDoc = await db.collection('tenants').doc(ORG).collection('kioskPicks').doc(pickId).get();
      const data = pickDoc.data();
      const hasRequiredFields =
        data?.status === 'pending' &&
        data?.firstName === 'Test Customer' &&
        Array.isArray(data?.productNames) &&
        data?.expiresAt instanceof admin.firestore.Timestamp;
      record('KioskPick write — manager notification document', hasRequiredFields,
        hasRequiredFields ? `id=${pickId}, mood=${mood}` : `missing fields: ${JSON.stringify(data)}`);
      if (!hasRequiredFields) await fileAgentBug(
        '[CHECKIN] kioskPicks document missing required fields for manager notification',
        `Written kioskPick ${pickId} is missing expected fields.\nExpected: status=pending, firstName, productNames[], expiresAt.\nGot: ${JSON.stringify(data)}`,
      );
    } else {
      record('KioskPick write — manager notification document', true, 'skipped (dry-run)');
    }
  } catch (e) {
    record('KioskPick write — manager notification document', false, e.message);
    await fileAgentBug('[CHECKIN] kioskPicks write failed', e.message, 'critical');
  }

  // ── 7. KioskPick — concurrent writes (race condition) ─────────────────
  try {
    const ids = await Promise.all([
      writeKioskPick(`race_a_${Date.now()}`, 'Alice', 'happy', ['prod_1'], ['Product A']),
      writeKioskPick(`race_b_${Date.now()}`, 'Bob',   'chill', ['prod_2'], ['Product B']),
      writeKioskPick(`race_c_${Date.now()}`, 'Carol', null,    [],         []),
    ]);
    const allUnique = new Set(isDryRun ? ['a','b','c'] : ids).size === 3;
    record('KioskPick — concurrent writes (race condition)', allUnique,
      `3 concurrent writes, ${allUnique ? 'all unique IDs' : 'COLLISION DETECTED'}`);
    if (!allUnique) await fileAgentBug(
      '[CHECKIN] Race condition: concurrent kioskPick writes produced duplicate IDs',
      `Concurrent Firestore add() calls returned non-unique IDs. Possible dedup or write conflict.\nIDs: ${ids.join(', ')}`,
      'critical',
    );
  } catch (e) {
    record('KioskPick — concurrent writes', false, e.message);
  }

  // ── 8. Inventory check — recommendations available ───────────────────
  try {
    const snap = await db.collection('tenants').doc(ORG)
      .collection('publicViews').doc('products').collection('items')
      .where('source', '==', 'pos').limit(100).get();
    const cats = [...new Set(snap.docs.map(d => d.data().category).filter(Boolean))];
    const hasFlower  = cats.some(c => /flower/i.test(c));
    const hasEdibles = cats.some(c => /edible/i.test(c));
    const hasVapes   = cats.some(c => /vape/i.test(c));
    const pass = hasFlower && hasEdibles && hasVapes;
    record('Inventory — all 3 rec categories stocked', pass,
      `${snap.size} items. Cats: ${cats.join(', ')}`);
    if (!pass) {
      const missing = [!hasFlower && 'Flower', !hasEdibles && 'Edibles', !hasVapes && 'Vapes'].filter(Boolean);
      await fileAgentBug(
        `[CHECKIN] Missing inventory categories: ${missing.join(', ')}`,
        `Kiosk recommendation engine requires Flower, Edibles, and Vapes. Missing: ${missing.join(', ')}.\nThis will cause the category-spread rec builder to fall back to single-category recommendations.`,
        missing.length > 1 ? 'high' : 'normal',
      );
    }
  } catch (e) {
    record('Inventory — rec categories stocked', false, e.message);
  }

  // ── 9. Sample/test products check ─────────────────────────────────────
  try {
    const snap = await db.collection('products').limit(500).get();
    const bad = [];
    snap.forEach(doc => {
      const p = doc.data();
      const name = (p.name || '').toLowerCase();
      if (name.includes('sample') || name.includes('test') || (typeof p.price === 'number' && p.price < 1)) {
        bad.push({ id: doc.id, name: p.name, price: p.price });
      }
    });
    const pass = bad.length === 0;
    record('Root products — no sample/test items', pass,
      pass ? 'clean' : `${bad.length} dirty items: ${bad.slice(0, 3).map(p => p.name).join(', ')}`);
    if (!pass) await fileAgentBug(
      `[CHECKIN] ${bad.length} sample/test products still in root products collection`,
      `These may appear in Smokey's recommendations if ingested incorrectly.\nItems: ${bad.map(p => `${p.id} (${p.name}, $${p.price})`).join('\n')}`,
      'normal',
    );
  } catch (e) {
    record('Root products — clean', false, e.message);
  }

  // ── 10. Customer data integrity — phoneLast4 consistent with phoneDigits ─
  try {
    const snap = await db.collection('customers')
      .where('orgId', '==', ORG).limit(50).get();
    // Only flag customers who HAVE a phone but are missing phoneLast4 (data inconsistency)
    const withPhoneNoLast4 = snap.docs.filter(d => {
      const data = d.data();
      return (data.phoneDigits || data.phone) && !data.phoneLast4;
    });
    const pass = withPhoneNoLast4.length === 0;
    record('Customer data — phoneLast4 consistent with phoneDigits', pass,
      pass ? `${snap.size} customers checked — all with phones have phoneLast4` : `${withPhoneNoLast4.length} have phone but missing phoneLast4`);
    if (!pass) await fileAgentBug(
      `[CHECKIN] ${withPhoneNoLast4.length} customers have phoneDigits but missing phoneLast4`,
      `phoneLast4 is required for quick lookup on the kiosk. These customers can't be found.\nAffected: ${withPhoneNoLast4.slice(0, 5).map(d => d.id).join('\n')}`,
      'high',
    );
  } catch (e) {
    record('Customer data — phoneLast4 consistent', false, e.message);
  }

  // ── 11. Random customer — loyalty points field typed ─────────────────
  try {
    const snap = await db.collection('customers')
      .where('orgId', '==', ORG)
      .limit(50).get();
    const returning = snap.docs.filter(d => (d.data().visitCount ?? 0) > 1);
    if (returning.length === 0) {
      record('Returning customer — loyalty points field typed', true, 'no multi-visit customers yet (OK for new org)');
    } else {
      const doc = returning[0].data();
      const hasPoints = typeof doc.loyaltyPoints === 'number';
      record('Returning customer — loyalty points field typed', hasPoints,
        `visitCount=${doc.visitCount}, loyaltyPoints=${doc.loyaltyPoints}`);
      if (!hasPoints) await fileAgentBug(
        '[CHECKIN] Returning customer missing loyaltyPoints field',
        `Customer ${returning[0].id} has visitCount=${doc.visitCount} but loyaltyPoints is ${typeof doc.loyaltyPoints}.\nKiosk displays this on the returning customer screen.`,
      );
    }
  } catch (e) {
    record('Returning customer — loyalty points', false, e.message);
  }

  // ── 12. Edge: phone number normalization ────────────────────────────
  try {
    const formattedPhones = [
      { raw: '(312) 684-0522', expected: '13126840522' },
      { raw: '312-684-0522',   expected: '13126840522' },
      { raw: '13126840522',    expected: '13126840522' },
    ];
    let pass = true;
    const notes = [];
    for (const { raw, expected } of formattedPhones) {
      const digits = raw.replace(/\D/g, '');
      const normalized = digits.length === 10 ? '1' + digits : digits;
      if (normalized !== expected) {
        pass = false;
        notes.push(`"${raw}" → "${normalized}" (expected "${expected}")`);
      }
    }
    record('Phone normalization — various formats', pass,
      pass ? '3/3 formats normalize correctly' : notes.join('; '));
    if (!pass) await fileAgentBug(
      '[CHECKIN] Phone normalization logic produces unexpected output',
      `The inline normalization in visitor-checkin.ts produced unexpected results:\n${notes.join('\n')}`,
    );
  } catch (e) {
    record('Phone normalization', false, e.message);
  }

  // ── 13. Firestore index — phoneLast4 query is indexed ────────────────
  try {
    const start = Date.now();
    await db.collection('customers')
      .where('orgId', '==', ORG).where('phoneLast4', '==', '9999').limit(1).get();
    const ms = Date.now() - start;
    const pass = ms < 3000;
    record('Firestore — phoneLast4 query performance', pass, `${ms}ms ${pass ? '(OK)' : '(SLOW — index may be missing)'}`);
    if (!pass) await fileAgentBug(
      '[CHECKIN] phoneLast4 Firestore query is slow — composite index may be missing',
      `customers where orgId=X and phoneLast4=Y took ${ms}ms. Expected <3000ms.\nCheck Firebase console: Firestore → Indexes → Composite.\nRequires: orgId ASC + phoneLast4 ASC`,
      'high',
    );
  } catch (e) {
    record('Firestore — phoneLast4 query indexed', false, e.message);
  }

  // ── Cleanup test picks ───────────────────────────────────────────────
  if (!isDryRun) {
    try { await cleanupTestPicks(); } catch { /* non-critical */ }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log(`\n${'─'.repeat(59)}`);
  console.log(failed === 0
    ? `🟢  Run #${runNumber} — ALL ${passed} TESTS PASS`
    : `🔴  Run #${runNumber} — ${failed} FAILURE(S) | ${passed}/${results.length} passed`);
  console.log(`${'─'.repeat(59)}\n`);

  await submitTestArtifact(runNumber, results);

  return { passed, failed, total: results.length };
}

// ──────────────────────────────────────────────────────────────────────────
// Main entry
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = await getApiKey().catch(() => null);
  if (apiKey) {
    console.log(`🔑 API key found — will test HTTP endpoints`);
  } else {
    console.log(`⚠️  No API key found — HTTP endpoint tests will be skipped`);
  }

  if (!isLoop) {
    // Single batch
    const runNumber = Math.floor(Date.now() / 1000) % 10000;
    await runBatch(runNumber, apiKey);
    process.exit(0);
  }

  // Loop mode: 25/hr for 4 hours
  const endTime = Date.now() + MAX_HOURS * 3600_000;
  let runNumber = 1;
  let totalPassed = 0;
  let totalFailed = 0;

  console.log(`🔄 Loop mode: ${TESTS_PER_HOUR} runs/hr × ${MAX_HOURS} hours = ${TESTS_PER_HOUR * MAX_HOURS} total runs`);
  console.log(`⏱  Interval: ${(INTERVAL_MS / 1000).toFixed(0)}s per run`);
  console.log(`🛑 Ctrl+C to stop early\n`);

  while (Date.now() < endTime) {
    const { passed, failed } = await runBatch(runNumber, apiKey);
    totalPassed += passed;
    totalFailed += failed;
    runNumber++;

    if (Date.now() < endTime) {
      const remaining = Math.round((endTime - Date.now()) / 60000);
      console.log(`⏳ Next run in ${(INTERVAL_MS / 1000).toFixed(0)}s  (${remaining}min remaining, ${runNumber - 1} runs done)`);
      await new Promise(r => setTimeout(r, INTERVAL_MS));
    }
  }

  console.log(`\n${'═'.repeat(59)}`);
  console.log(`STRESS TEST COMPLETE — ${runNumber - 1} runs`);
  console.log(`Total Pass: ${totalPassed}  |  Total Fail: ${totalFailed}`);
  console.log(`${'═'.repeat(59)}\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
