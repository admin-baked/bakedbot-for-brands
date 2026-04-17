#!/usr/bin/env node
/**
 * inspect-agent-quality.mjs
 *
 * Pulls current agent_quality tasks + coaching patches from Firestore.
 * Run to understand what the daily audit flagged before making agent fixes.
 *
 * Usage:
 *   node scripts/inspect-agent-quality.mjs
 *   node scripts/inspect-agent-quality.mjs --agents=marty,linus,elroy
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const args = Object.fromEntries(
    process.argv.slice(2).filter(a => a.startsWith('--'))
        .map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=') || 'true']; })
);
const filterAgents = args['agents'] ? args['agents'].split(',').map(a => a.trim().toLowerCase()) : null;

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
    const { getFirestore } = await import('firebase-admin/firestore');
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

function hr(char = '─', len = 70) { return char.repeat(len); }

async function main() {
    const db = await getDb();

    // --- 1. Open agent_quality tasks ---
    console.log('\n' + hr('═'));
    console.log('AGENT QUALITY TASKS (open/queued)');
    console.log(hr('═'));

    const tasksSnap = await db.collection('agent_tasks')
        .where('category', '==', 'agent_quality')
        .limit(50)
        .get();

    if (tasksSnap.empty) {
        console.log('No open agent_quality tasks found.');
    } else {
        for (const doc of tasksSnap.docs) {
            const t = doc.data();
            // Filter by agent if requested
            if (filterAgents) {
                const title = (t.title || '').toLowerCase();
                if (!filterAgents.some(a => title.includes(a))) continue;
            }
            console.log(`\n[${t.priority?.toUpperCase() || 'NORMAL'}] ${t.title}`);
            console.log(`  id: ${doc.id} | status: ${t.status} | assignedTo: ${t.assignedTo || 'unassigned'}`);
            console.log(`  created: ${t.createdAt?.toDate?.()?.toISOString?.() || t.createdAt}`);
            if (t.body) {
                // Print body with indentation
                const lines = t.body.split('\n').slice(0, 20);
                console.log(hr());
                lines.forEach(l => console.log('  ' + l));
                if (t.body.split('\n').length > 20) console.log('  ... (truncated)');
                console.log(hr());
            }
        }
    }

    // --- 2. Latest coaching patches ---
    console.log('\n' + hr('═'));
    console.log('CURRENT COACHING PATCHES (agent_coaching/{agent}_latest)');
    console.log(hr('═'));

    const agents = filterAgents || ['marty benjamins', 'marty', 'linus', 'elroy', 'uncle elroy', 'dayday', 'day day', 'smokey', 'craig', 'ezal', 'deebo'];
    const agentKeys = filterAgents
        ? filterAgents.map(a => `${a}_latest`)
        : ['marty benjamins_latest', 'marty_latest', 'linus_latest', 'elroy_latest', 'uncle elroy_latest', 'dayday_latest', 'smokey_latest', 'craig_latest'];

    for (const key of agentKeys) {
        const doc = await db.collection('agent_coaching').doc(key).get();
        if (!doc.exists) {
            console.log(`\n[${key}] No coaching patch found.`);
            continue;
        }
        const d = doc.data();
        console.log(`\n[${key}] priority: ${d.priority} | auditDate: ${d.auditDate}`);
        console.log(`  Patterns (${d.patterns?.length || 0}):`);
        (d.patterns || []).forEach((p, i) => console.log(`    ${i + 1}. ${p}`));
        console.log(`  Instructions (${d.instructions?.length || 0}):`);
        (d.instructions || []).forEach((ins, i) => console.log(`    ${i + 1}. ${ins}`));
        if (d.exampleFixes?.length) {
            console.log(`  Example fixes (${d.exampleFixes.length}):`);
            d.exampleFixes.slice(0, 2).forEach((ex, i) => {
                console.log(`    [${i + 1}] Q: "${(ex.userMessage || '').slice(0, 80)}"`);
                console.log(`         Bad: "${(ex.badResponse || '').slice(0, 120)}"`);
                console.log(`         Good: "${(ex.improvedResponse || '').slice(0, 120)}"`);
            });
        }
        if (d.deliberation?.agreement) {
            console.log(`  Deliberation: ${d.deliberation.agreement.slice(0, 200)}`);
        }
    }

    // --- 3. Latest audit report summary ---
    console.log('\n' + hr('═'));
    console.log('LATEST AUDIT REPORT SUMMARY');
    console.log(hr('═'));

    const auditSnap = await db.collection('agent_audit_reports')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    if (auditSnap.empty) {
        console.log('No audit reports found.');
    } else {
        const r = auditSnap.docs[0].data();
        console.log(`\nDate: ${r.auditDate} | Total: ${r.totalResponses} | Graded: ${r.graded} | Avg: ${r.averageScore}`);
        console.log(`Grades: great=${r.grades?.great} good=${r.grades?.good} acceptable=${r.grades?.acceptable} poor=${r.grades?.poor} fail=${r.grades?.fail}`);
        console.log(`Summary: ${(r.summary || '').slice(0, 300)}`);
        if (r.agentBreakdown) {
            console.log('\nAgent breakdown:');
            Object.entries(r.agentBreakdown).forEach(([agent, stats]) => {
                const s = stats;
                console.log(`  ${agent}: avg=${s.avgScore} total=${s.total} great=${s.great} poor=${s.poor} fail=${s.fail}`);
            });
        }
        if (r.issues?.length) {
            console.log(`\nTop issues (${r.issues.filter(i => i.grade === 'poor' || i.grade === 'fail').length} poor/fail):`);
            r.issues
                .filter(i => i.grade === 'poor' || i.grade === 'fail')
                .slice(0, 10)
                .forEach(issue => {
                    console.log(`\n  [${issue.grade.toUpperCase()} ${issue.score}] ${issue.agent}`);
                    console.log(`    Q: "${(issue.userMessage || '').slice(0, 100)}"`);
                    console.log(`    A: "${(issue.agentResponse || '').slice(0, 150)}"`);
                    console.log(`    Issue: ${issue.issue || 'n/a'}`);
                    console.log(`    Fix: ${issue.suggestedFix || 'n/a'}`);
                    if (issue.dimensions) {
                        const d = issue.dimensions;
                        console.log(`    Dims: acc=${d.accuracy} tool=${d.toolUse} ctx=${d.contextHandling} action=${d.actionability} comp=${d.compliance} depth=${d.depth}`);
                    }
                });
        }
    }

    console.log('\n' + hr('═') + '\n');
}

main().catch(e => { console.error(e); process.exit(1); });
