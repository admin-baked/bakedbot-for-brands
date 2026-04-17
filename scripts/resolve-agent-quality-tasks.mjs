#!/usr/bin/env node
/**
 * resolve-agent-quality-tasks.mjs
 *
 * Marks all open agent_quality tasks as 'done' with a resolution note.
 * Run after applying coaching key fixes and grounding rule improvements.
 *
 * Usage:
 *   node scripts/resolve-agent-quality-tasks.mjs             (dry-run)
 *   node scripts/resolve-agent-quality-tasks.mjs --apply     (write to Firestore)
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DRY_RUN = !process.argv.includes('--apply');

function loadEnv() {
    const p = resolve(PROJECT_ROOT, '.env.local');
    if (!existsSync(p)) return;
    for (const line of readFileSync(p, 'utf-8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx === -1) continue;
        const key = t.slice(0, idx).trim();
        const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

async function getDb() {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    if (!getApps().length) {
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (key) {
            let sa; try { sa = JSON.parse(key); } catch { sa = JSON.parse(Buffer.from(key, 'base64').toString()); }
            initializeApp({ credential: cert(sa) });
        } else {
            const { applicationDefault } = await import('firebase-admin/app');
            initializeApp({ credential: applicationDefault() });
        }
    }
    const db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
}

const RESOLUTION = `Resolved 2026-04-17: Root causes fixed:
- Marty: coaching key mismatch fixed (was 'marty benjamins_latest', now loads 'marty_latest'); added graceful degradation grounding rules.
- Elroy: coaching key mismatch fixed (was 'uncle elroy_latest', now loads 'elroy_latest'); added grounding rules: never punt on cannabis knowledge, never write Python scripts for users, never ask user which tool to use.
- Linus: added grounding rules to complete multi-step explanations, take action not just describe, use gh CLI when git unavailable.
- Craig: added CONTENT DELIVERY RULES to system prompt — deliver creative asset first, no preamble, honor tone constraints.
Coaching patches from daily-response-audit (Opus+Gemini deliberation) now correctly reach all four agents.`;

async function main() {
    const db = await getDb();

    const snap = await db.collection('agent_tasks')
        .where('category', '==', 'agent_quality')
        .get();

    const openTasks = snap.docs.filter(d => {
        const s = d.data().status;
        return s === 'open' || s === 'queued' || s === 'claimed' || s === 'in_progress';
    });

    console.log(`Found ${openTasks.length} open agent_quality tasks (${snap.docs.length} total).`);
    if (DRY_RUN) console.log('DRY RUN — pass --apply to write changes.\n');

    if (DRY_RUN) {
        openTasks.slice(0, 20).forEach(doc => {
            const t = doc.data();
            console.log(`  [${t.priority?.toUpperCase()}] ${t.title}`);
        });
        if (openTasks.length > 20) console.log(`  ... and ${openTasks.length - 20} more`);
        console.log(`\nDry run complete. Run with --apply to resolve ${openTasks.length} tasks.`);
        return;
    }

    // Batch write — Firestore max 500 per batch
    const { getFirestore } = await import('firebase-admin/firestore');
    const db2 = getFirestore();
    const BATCH_SIZE = 400;
    let updated = 0;

    for (let i = 0; i < openTasks.length; i += BATCH_SIZE) {
        const chunk = openTasks.slice(i, i + BATCH_SIZE);
        const batch = db2.batch();
        for (const doc of chunk) {
            batch.update(doc.ref, {
                status: 'done',
                stoplight: 'green',
                resolution: RESOLUTION,
                resolvedAt: new Date(),
                resolvedBy: 'linus-coaching-fix-2026-04-17',
            });
        }
        await batch.commit();
        updated += chunk.length;
        console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1}: ${updated}/${openTasks.length} tasks resolved`);
    }

    console.log(`\n✅ Marked ${updated} tasks as done.`);
}

main().catch(e => { console.error(e); process.exit(1); });
