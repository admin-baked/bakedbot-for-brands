/**
 * check-claude-limit.mjs
 *
 * Reports weekly Claude Code usage against a configurable budget.
 * Run manually — NOT wired as a hook (hooks can cause lockout if they crash).
 *
 * Usage:
 *   node scripts/check-claude-limit.mjs
 *   npm run check-limit
 *
 * Config (via env):
 *   CLAUDE_WEEKLY_MSG_LIMIT   Weekly message budget (default: 2000)
 *
 * When to switch:
 *   >= 80%  → Warning — consider switching soon
 *   >= 95%  → Switch now: npm run switch-model glm-4.7
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const WEEKLY_LIMIT = parseInt(process.env.CLAUDE_WEEKLY_MSG_LIMIT || '2000', 10);
const META_DIR = path.join(os.homedir(), '.claude', 'usage-data', 'session-meta');
const SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json');

function getWeeklyStats() {
    if (!fs.existsSync(META_DIR)) return { messages: 0, sessions: 0, dailyBreakdown: {} };

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let messages = 0;
    let sessions = 0;
    const dailyBreakdown = {};

    for (const file of fs.readdirSync(META_DIR)) {
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(META_DIR, file), 'utf8'));
            const ts = new Date(meta.start_time).getTime();
            if (ts >= weekAgo) {
                const day = meta.start_time.slice(0, 10);
                const msgs = (meta.user_message_count || 0) + (meta.assistant_message_count || 0);
                messages += msgs;
                sessions++;
                dailyBreakdown[day] = (dailyBreakdown[day] || 0) + msgs;
            }
        } catch { /* skip corrupt files */ }
    }

    return { messages, sessions, dailyBreakdown };
}

function currentProvider() {
    try {
        const s = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        const baseUrl = s?.env?.ANTHROPIC_BASE_URL || '';
        if (baseUrl.includes('z.ai')) {
            return `Z.AI (${s?.env?.CLAUDE_TOOL_MODEL || 'glm-?'})`;
        }
        return `Anthropic (${s?.env?.CLAUDE_TOOL_MODEL || 'default'})`;
    } catch {
        return 'Anthropic (default)';
    }
}

const { messages, sessions, dailyBreakdown } = getWeeklyStats();
const pct = Math.min(Math.round((messages / WEEKLY_LIMIT) * 100), 100);
const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
const provider = currentProvider();

console.log('\nClaude Code Weekly Usage');
console.log('─'.repeat(45));
console.log(`  Provider:  ${provider}`);
console.log(`  Sessions:  ${sessions} this week`);
console.log(`  Messages:  ${messages.toLocaleString()} / ${WEEKLY_LIMIT.toLocaleString()}`);
console.log(`  Usage:     [${bar}] ${pct}%`);
console.log('');

// Daily breakdown (last 7 days)
const days = Object.keys(dailyBreakdown).sort().slice(-7);
if (days.length > 0) {
    console.log('  Daily breakdown:');
    for (const day of days) {
        const count = dailyBreakdown[day];
        const dayBar = '▪'.repeat(Math.min(Math.round(count / 50), 20));
        console.log(`    ${day}  ${dayBar} ${count.toLocaleString()}`);
    }
    console.log('');
}

if (pct >= 95) {
    console.log('  STATUS: CRITICAL — Switch to Z.AI now:');
    console.log('    npm run switch-model glm-4.7');
} else if (pct >= 80) {
    console.log('  STATUS: WARNING — Approaching limit. Prepare to switch:');
    console.log('    npm run switch-model glm-4.7');
} else {
    console.log('  STATUS: OK');
}

console.log('');
