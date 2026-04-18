#!/usr/bin/env node
/**
 * Agent Coordination CLI — check locks, claim files, send messages before touching shared primitives.
 *
 * Usage:
 *   node scripts/agent-coord.mjs status                                         # startup board
 *   node scripts/agent-coord.mjs claim <file> --agent claude --intent "..."     # claim a file
 *   node scripts/agent-coord.mjs release <file> --agent claude                  # release when done
 *   node scripts/agent-coord.mjs start --agent claude --task "..." --files "a,b"# set in-progress status
 *   node scripts/agent-coord.mjs done --agent claude                            # mark done
 *   node scripts/agent-coord.mjs inbox --agent claude                           # unread messages
 *   node scripts/agent-coord.mjs message --from claude --to codex --re <file> --body "..."
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

function initFirebase() {
  if (getApps().length > 0) return;
  const keyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyB64) { console.error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local'); process.exit(1); }
  const serviceAccount = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}

const args = process.argv.slice(2);
const cmd = args[0];

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] ?? null : null;
}

function lockId(file) {
  return file.replace(/[/\\:.]/g, '_');
}

const LOCK_TTL_MS = 2 * 60 * 60 * 1000;

function fmt(ts) {
  if (!ts) return '?';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

async function cmdStatus() {
  initFirebase();
  const db = getFirestore();
  const now = new Date();

  const [locks, statuses, messages] = await Promise.all([
    db.collection('agent_locks').get(),
    db.collection('agent_status').get(),
    db.collection('agent_messages').where('read', '==', false).get(),
  ]);

  const activeLocks = locks.docs
    .map(d => d.data())
    .filter(l => l.expiresAt?.toDate ? l.expiresAt.toDate() > now : true);

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║      AGENT COORDINATION BOARD            ║');
  console.log('╚══════════════════════════════════════════╝\n');

  if (statuses.size === 0) {
    console.log('  No agents currently active.\n');
  } else {
    console.log('  AGENT STATUS:');
    for (const d of statuses.docs) {
      const s = d.data();
      const icon = s.phase === 'done' ? '✅' : s.phase === 'blocked' ? '🚫' : s.phase === 'in-progress' ? '🔧' : '📋';
      console.log(`  ${icon} ${s.agent.padEnd(10)} ${s.phase.padEnd(12)} ${s.task}`);
      if (s.files?.length) console.log(`             files: ${s.files.join(', ')}`);
    }
    console.log('');
  }

  if (activeLocks.length === 0) {
    console.log('  FILE LOCKS: none\n');
  } else {
    console.log('  FILE LOCKS:');
    for (const l of activeLocks) {
      const exp = l.expiresAt?.toDate ? l.expiresAt.toDate() : null;
      const remaining = exp ? Math.round((exp - now) / 60000) : '?';
      console.log(`  🔒 ${l.agent.padEnd(10)} ${l.file}`);
      console.log(`             intent: ${l.intent}  (expires in ${remaining}m)`);
    }
    console.log('');
  }

  const unread = messages.docs.filter(d => d.data().to === 'all' || true);
  if (unread.length > 0) {
    console.log(`  📬 ${unread.length} unread message(s) — run: node scripts/agent-coord.mjs inbox --agent <you>\n`);
  }
}

async function cmdClaim() {
  const file = args[1];
  const agent = getArg('agent');
  const intent = getArg('intent');
  if (!file || !agent || !intent) {
    console.error('Usage: agent-coord.mjs claim <file> --agent <id> --intent "..."');
    process.exit(1);
  }

  initFirebase();
  const db = getFirestore();
  const ref = db.collection('agent_locks').doc(lockId(file));
  const now = Date.now();

  const snap = await ref.get();
  if (snap.exists) {
    const existing = snap.data();
    const expired = existing.expiresAt?.toDate ? existing.expiresAt.toDate() < new Date() : false;
    if (!expired && existing.agent !== agent) {
      console.log(`\n⚠️  CONFLICT: ${existing.agent} already holds ${file}`);
      console.log(`   Intent: ${existing.intent}`);
      console.log(`\n   Options:`);
      console.log(`   1. Send them a message: node scripts/agent-coord.mjs message --from ${agent} --to ${existing.agent} --re "${file}" --body "..."`);
      console.log(`   2. Wait for their lock to expire (~${Math.round((existing.expiresAt.toDate() - new Date()) / 60000)}m)`);
      process.exit(1);
    }
  }

  await ref.set({
    agent,
    file,
    intent,
    claimedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(now + LOCK_TTL_MS),
  });
  console.log(`\n✅ Claimed: ${file}`);
  console.log(`   Agent:  ${agent}`);
  console.log(`   Intent: ${intent}`);
  console.log(`   Release when done: node scripts/agent-coord.mjs release ${file} --agent ${agent}\n`);
}

async function cmdRelease() {
  const file = args[1];
  const agent = getArg('agent');
  if (!file || !agent) { console.error('Usage: agent-coord.mjs release <file> --agent <id>'); process.exit(1); }

  initFirebase();
  const db = getFirestore();
  const ref = db.collection('agent_locks').doc(lockId(file));
  const snap = await ref.get();

  if (!snap.exists) { console.log(`  No lock on ${file}.`); return; }
  const data = snap.data();
  if (data.agent !== agent) { console.log(`  Lock is held by ${data.agent}, not ${agent}. Cannot release.`); return; }

  await ref.delete();
  console.log(`\n🔓 Released: ${file}\n`);
}

async function cmdStart() {
  const agent = getArg('agent');
  const task = getArg('task');
  const filesRaw = getArg('files');
  if (!agent || !task) { console.error('Usage: agent-coord.mjs start --agent <id> --task "..." --files "file1,file2"'); process.exit(1); }

  initFirebase();
  const db = getFirestore();
  await db.collection('agent_status').doc(agent).set({
    agent,
    task,
    files: filesRaw ? filesRaw.split(',').map(f => f.trim()) : [],
    phase: 'in-progress',
    startedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`\n🔧 ${agent} → in-progress: ${task}\n`);
}

async function cmdDone() {
  const agent = getArg('agent');
  if (!agent) { console.error('Usage: agent-coord.mjs done --agent <id>'); process.exit(1); }

  initFirebase();
  const db = getFirestore();
  // Release all locks held by this agent
  const locks = await db.collection('agent_locks').where('agent', '==', agent).get();
  const batch = db.batch();
  for (const d of locks.docs) batch.delete(d.ref);
  batch.set(db.collection('agent_status').doc(agent), {
    phase: 'done',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  console.log(`\n✅ ${agent} marked done. ${locks.size} lock(s) released.\n`);
}

async function cmdInbox() {
  const agent = getArg('agent');
  if (!agent) { console.error('Usage: agent-coord.mjs inbox --agent <id>'); process.exit(1); }

  initFirebase();
  const db = getFirestore();
  const [direct, broadcast] = await Promise.all([
    db.collection('agent_messages').where('to', '==', agent).where('read', '==', false).orderBy('ts', 'desc').get(),
    db.collection('agent_messages').where('to', '==', 'all').where('read', '==', false).orderBy('ts', 'desc').get(),
  ]);

  const seen = new Set();
  const msgs = [...direct.docs, ...broadcast.docs]
    .filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; })
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.ts?.toMillis?.() ?? 0) - (a.ts?.toMillis?.() ?? 0));

  if (msgs.length === 0) { console.log(`\n📭 No unread messages for ${agent}.\n`); return; }

  console.log(`\n📬 ${msgs.length} unread message(s) for ${agent}:\n`);
  for (const m of msgs) {
    console.log(`  From: ${m.from}  Re: ${m.re}  [${fmt(m.ts)}]`);
    console.log(`  ${m.body}\n`);
  }

  // Mark as read
  const batch = db.batch();
  for (const m of msgs) batch.update(db.collection('agent_messages').doc(m.id), { read: true });
  await batch.commit();
}

async function cmdMessage() {
  const from = getArg('from');
  const to = getArg('to') ?? 'all';
  const re = getArg('re') ?? 'general';
  const body = getArg('body');
  if (!from || !body) { console.error('Usage: agent-coord.mjs message --from <id> --to <id|all> --re <file> --body "..."'); process.exit(1); }

  initFirebase();
  const db = getFirestore();
  const ref = await db.collection('agent_messages').add({ from, to, re, body, ts: FieldValue.serverTimestamp(), read: false });
  console.log(`\n✉️  Message sent [${ref.id}]\n   From: ${from} → ${to}  Re: ${re}\n   ${body}\n`);
}

// Router
const commands = { status: cmdStatus, claim: cmdClaim, release: cmdRelease, start: cmdStart, done: cmdDone, inbox: cmdInbox, message: cmdMessage };

if (!cmd || !commands[cmd]) {
  console.log('Usage: node scripts/agent-coord.mjs <status|claim|release|start|done|inbox|message> [options]');
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch(err => { console.error('Error:', err.message); process.exit(1); });
