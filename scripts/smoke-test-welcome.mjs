#!/usr/bin/env node

/**
 * smoke-test-welcome.mjs — Smoke test Mrs. Parker welcome emails
 *
 * Queues welcome email jobs and triggers the job processor.
 *
 * Usage:
 *   node scripts/smoke-test-welcome.mjs              # dry-run
 *   node scripts/smoke-test-welcome.mjs --apply      # queue + send
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// ── Env loading ──────────────────────────────────────────────────────────────
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split(/\r?\n/).forEach((line) => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const eqIdx = line.indexOf('=');
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();
            if (key && !process.env[key]) process.env[key] = value;
        }
    });
}

// ── Firebase init ────────────────────────────────────────────────────────────
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve('service-account.json');

if (!getApps().length) {
    initializeApp({
        credential: cert(JSON.parse(fs.readFileSync(saPath, 'utf-8'))),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();
const DRY_RUN = !process.argv.includes('--apply');

// ── Test cases ───────────────────────────────────────────────────────────────
const TEST_JOBS = [
    {
        label: 'Thrive Syracuse — martez@bakedbot.ai',
        data: {
            leadId: `smoke_thrive_${Date.now()}`,
            email: 'martez@bakedbot.ai',
            firstName: 'Martez',
            dispensaryId: 'org_thrive_syracuse',
            source: 'brand_rewards_checkin',  // Triggers Thrive VIP path
            state: 'NY',
        },
    },
    {
        label: 'Ecstatic Edibles — martez@bakedbot.ai',
        data: {
            leadId: `smoke_ecstatic_martez_${Date.now()}`,
            email: 'martez@bakedbot.ai',
            firstName: 'Martez',
            brandId: 'brand_ecstatic_edibles',
            source: 'age_gate_welcome',
            state: 'NY',
        },
    },
    {
        label: 'Ecstatic Edibles — keith@mrinfluencecoach.co',
        data: {
            leadId: `smoke_ecstatic_keith_${Date.now()}`,
            email: 'keith@mrinfluencecoach.co',
            firstName: 'Keith',
            brandId: 'brand_ecstatic_edibles',
            source: 'age_gate_welcome',
        },
    },
];

async function main() {
    console.log(`\n🧪 Welcome Email Smoke Test`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY (will send real emails!)'}\n`);

    const jobIds = [];

    for (const test of TEST_JOBS) {
        console.log(`   📧 ${test.label}`);

        if (DRY_RUN) {
            console.log(`      [DRY RUN] Would queue job: ${JSON.stringify(test.data.email)}`);
            continue;
        }

        const ref = await db.collection('jobs').add({
            type: 'send_welcome_email',
            agent: 'mrs_parker',
            status: 'pending',
            data: test.data,
            createdAt: Date.now(),
            priority: 'high',
            _smokeTest: true,
        });

        console.log(`      ✅ Job queued: ${ref.id}`);
        jobIds.push(ref.id);
    }

    if (DRY_RUN) {
        console.log(`\n   Run with --apply to actually send emails.\n`);
        return;
    }

    // Trigger the welcome job processor
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.log(`\n   ⚠️  CRON_SECRET not set — cannot trigger job processor.`);
        console.log(`      Jobs are queued; they'll process on next cron tick.\n`);
        return;
    }

    console.log(`\n   🚀 Triggering welcome job processor...`);

    try {
        const resp = await fetch(`${appUrl}/api/jobs/welcome`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await resp.json();
        console.log(`      Status: ${resp.status}`);
        console.log(`      Processed: ${result.processed || 0}`);

        if (result.results) {
            for (const r of result.results) {
                const icon = r.status === 'completed' ? '✅' : '❌';
                console.log(`      ${icon} ${r.type}: ${r.email || r.phone} — ${r.status}`);
                if (r.error) console.log(`         Error: ${r.error}`);
            }
        }
    } catch (err) {
        console.log(`      ❌ Failed to trigger processor: ${err.message}`);
        console.log(`      Jobs are queued; they'll process on next cron tick.`);
    }

    // Wait a moment then check job statuses
    console.log(`\n   ⏳ Checking job statuses in 5s...`);
    await new Promise((r) => setTimeout(r, 5000));

    for (const jobId of jobIds) {
        const doc = await db.collection('jobs').doc(jobId).get();
        const data = doc.data();
        const icon = data.status === 'completed' ? '✅' : data.status === 'failed' ? '❌' : '⏳';
        console.log(`      ${icon} ${jobId}: ${data.status} (${data.data?.email})`);
        if (data.error) console.log(`         Error: ${data.error}`);
    }

    console.log(`\n   Done! Check inboxes for welcome emails.\n`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
