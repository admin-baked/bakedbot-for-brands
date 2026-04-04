/**
 * Super Power SP13: Opencode Task Runner
 *
 * Delegates a focused coding task to the Opencode Cloud Run agent.
 * Uses free Zen models by default — no Claude/Anthropic budget consumed.
 *
 * Usage (local CLI):
 *   node scripts/opencode-task.mjs --prompt "fix the type error in src/app/api/checkin/lookup/route.ts"
 *   node scripts/opencode-task.mjs --prompt "..." --model zen/kimi-k24
 *   node scripts/opencode-task.mjs --prompt "..." --model anthropic/claude-sonnet-4-6
 *
 * Usage (Linus Slack):
 *   @linus execute execute_super_power script=opencode-task options="--prompt \"fix the type error in checkin route\""
 *
 * Env vars required:
 *   OPENCODE_AGENT_URL   — Cloud Run service URL (set in apphosting.yaml)
 *   CRON_SECRET          — Internal bearer token
 */

import { parseArgs } from 'node:util';

// ── Config ─────────────────────────────────────────────────────────────────────

const OPENCODE_AGENT_URL = process.env.OPENCODE_AGENT_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const DEFAULT_MODEL = 'zen/big-pickle';

// ── Args ───────────────────────────────────────────────────────────────────────

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        prompt:  { type: 'string', short: 'p' },
        model:   { type: 'string', short: 'm', default: DEFAULT_MODEL },
        session: { type: 'string', short: 's' },
        json:    { type: 'boolean', default: false },
    },
    allowPositionals: true,
});

if (!values.prompt) {
    console.error('❌ --prompt is required');
    console.error('   Usage: node scripts/opencode-task.mjs --prompt "your task here"');
    process.exit(1);
}

if (!CRON_SECRET) {
    console.error('❌ CRON_SECRET not set. Run: source .env.local or pull secrets.');
    process.exit(1);
}

// ── Execute ────────────────────────────────────────────────────────────────────

console.log(`🤖 Opencode Agent — model: ${values.model}`);
console.log(`📝 Prompt: ${values.prompt.slice(0, 120)}${values.prompt.length > 120 ? '…' : ''}`);
console.log('');

const endpoint = `${NEXT_PUBLIC_APP_URL}/api/opencode/run`;

let res;
try {
    res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({
            prompt: values.prompt,
            model: values.model,
            ...(values.session ? { sessionId: values.session } : {}),
        }),
    });
} catch (err) {
    console.error(`❌ Network error: ${err.message}`);
    console.error(`   Is the dev server running? (npm run dev)`);
    process.exit(1);
}

const data = await res.json();

if (!res.ok) {
    console.error(`❌ Error ${res.status}: ${data.error ?? 'Unknown error'}`);
    process.exit(1);
}

if (values.json) {
    console.log(JSON.stringify(data, null, 2));
} else {
    console.log(`✅ Session: ${data.sessionId}`);
    console.log(`   Model: ${data.model}`);
    console.log('');
    console.log('─'.repeat(60));
    console.log(data.result);
    console.log('─'.repeat(60));
}
