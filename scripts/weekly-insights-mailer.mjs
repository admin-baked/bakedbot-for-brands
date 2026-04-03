#!/usr/bin/env node
/**
 * weekly-insights-mailer.mjs — Weekly Claude Code Insights Report
 *
 * 1. Reads session facets from ~/.claude/usage-data/facets/
 * 2. Aggregates friction points, satisfaction, goal achievement
 * 3. Uses Claude Haiku to extract top issues + CLAUDE.md suggestions
 * 4. Saves dated report to ~/.claude/insights/weekly-reports/
 * 5. Emails summary to RECIPIENT_EMAIL via Mailjet
 *
 * Usage:
 *   node scripts/weekly-insights-mailer.mjs [--dry-run] [--days=7]
 *
 * Required env vars:
 *   MAILJET_API_KEY, MAILJET_SECRET_KEY — Mailjet credentials
 *   ANTHROPIC_API_KEY                  — for Claude Haiku analysis
 *
 * Optional:
 *   RECIPIENT_EMAIL  (default: martez@bakedbot.ai)
 *   SENDER_EMAIL     (default: linus@bakedbot.ai)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { homedir } from 'os';
import Anthropic from '@anthropic-ai/sdk';
import Mailjet from 'node-mailjet';

// Load .env.local (mirrors desktop-test-loop pattern)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key] && val) process.env[key] = val;
  }
}
// Support CLAUDE_API_KEY as alias for ANTHROPIC_API_KEY
if (!process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) {
  process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;
}

// ── Config ────────────────────────────────────────────────────────────────────

const FACETS_DIR = join(homedir(), '.claude', 'usage-data', 'facets');
const REPORTS_DIR = join(homedir(), '.claude', 'insights', 'weekly-reports');
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL ?? 'martez@bakedbot.ai';
const SENDER_EMAIL = process.env.SENDER_EMAIL ?? 'linus@bakedbot.ai';
const SENDER_NAME = 'Linus · BakedBot CTO';

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    days: { type: 'string', default: '7' },
  },
  strict: false,
});

const DRY_RUN = args['dry-run'];
const LOOKBACK_DAYS = parseInt(args.days);

// ── Load facets ───────────────────────────────────────────────────────────────

function loadRecentFacets() {
  if (!existsSync(FACETS_DIR)) throw new Error(`Facets dir not found: ${FACETS_DIR}`);

  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const files = readdirSync(FACETS_DIR).filter((f) => f.endsWith('.json'));

  const facets = [];
  for (const file of files) {
    try {
      const stat = { mtime: new Date(readFileSync(join(FACETS_DIR, file)).toString().slice(0, 0)) };
      const raw = readFileSync(join(FACETS_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      // Include all facets — filter by session_id presence as proxy for validity
      if (data.session_id) facets.push(data);
    } catch { /* skip malformed */ }
  }

  // Can't filter by date from facet data alone — include all and let Claude summarize the week
  return facets;
}

// ── Aggregate stats ───────────────────────────────────────────────────────────

function aggregateFacets(facets) {
  const total = facets.length;
  const outcomes = {};
  const frictionDetails = [];
  const frictionCounts = {};
  const goalCategories = {};
  let satisfied = 0;

  for (const f of facets) {
    // Outcomes
    outcomes[f.outcome] = (outcomes[f.outcome] ?? 0) + 1;
    if (f.user_satisfaction_counts?.likely_satisfied) satisfied++;

    // Friction
    if (f.friction_detail) frictionDetails.push(f.friction_detail);
    for (const [k, v] of Object.entries(f.friction_counts ?? {})) {
      frictionCounts[k] = (frictionCounts[k] ?? 0) + v;
    }

    // Goal categories
    for (const [k, v] of Object.entries(f.goal_categories ?? {})) {
      goalCategories[k] = (goalCategories[k] ?? 0) + v;
    }
  }

  return { total, outcomes, frictionDetails, frictionCounts, goalCategories, satisfied };
}

// ── Claude analysis ───────────────────────────────────────────────────────────

async function analyzeWithClaude(stats, facets) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const client = new Anthropic({ apiKey });

  const sampleSummaries = facets
    .filter((f) => f.brief_summary)
    .slice(0, 30)
    .map((f) => `- [${f.outcome}] ${f.brief_summary}`)
    .join('\n');

  const prompt = `You are analyzing a developer's Claude Code usage for the past ${LOOKBACK_DAYS} days.

## Stats
- Total sessions: ${stats.total}
- Satisfied: ${stats.satisfied}/${stats.total}
- Outcomes: ${JSON.stringify(stats.outcomes)}
- Top friction types: ${JSON.stringify(stats.frictionCounts)}
- Top goal categories: ${JSON.stringify(stats.goalCategories)}

## Friction Details (raw)
${stats.frictionDetails.slice(0, 20).join('\n') || '(none)'}

## Sample Session Summaries
${sampleSummaries}

---

Produce a JSON report with:
{
  "headline": "<one punchy sentence summarizing the week>",
  "top_friction_points": [
    { "issue": "<friction pattern>", "frequency": "<how often>", "impact": "high|medium|low" }
  ],
  "wins": ["<what went well this week>"],
  "claude_md_rules_to_add": [
    { "section": "<section name>", "rule": "<rule text>", "why": "<why this helps>" }
  ],
  "features_to_try": [
    { "feature": "<Claude Code feature>", "why": "<why it fits their workflow>" }
  ],
  "weekly_score": { "goal_achievement": "<X%>", "satisfaction": "<X%>", "trend": "improving|stable|declining" },
  "one_thing_to_fix": "<single highest-leverage change for next week>"
}

Be specific and actionable. Reference actual patterns from the session data above.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Try code block first, then bare object
  const candidates = [
    text.match(/```json\s*\n([\s\S]*?)\n```/)?.[1],
    text.match(/```\s*\n([\s\S]*?)\n```/)?.[1],
    text.match(/(\{[\s\S]*\})/)?.[1],
  ].filter(Boolean);

  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try next */ }
  }

  // Last resort: ask Claude to fix its own JSON
  console.warn('[Insights] Claude returned malformed JSON — retrying with strict JSON prompt');
  const fixResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [
      { role: 'user', content: prompt },
      { role: 'assistant', content: text },
      { role: 'user', content: 'Your response contained invalid JSON. Return ONLY the raw JSON object, no markdown, no explanation.' },
    ],
  });
  const fixText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text : '';
  return JSON.parse(fixText.match(/(\{[\s\S]*\})/)?.[1] ?? fixText);
}

// ── Build email HTML ──────────────────────────────────────────────────────────

function buildEmailHtml(report, stats, weekLabel) {
  const frictionRows = (report.top_friction_points ?? [])
    .map((f) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${f.issue}</td><td style="padding:8px;border-bottom:1px solid #eee;color:#666">${f.frequency}</td><td style="padding:8px;border-bottom:1px solid #eee"><span style="background:${f.impact === 'high' ? '#fee2e2' : f.impact === 'medium' ? '#fef9c3' : '#dcfce7'};padding:2px 8px;border-radius:12px;font-size:12px">${f.impact}</span></td></tr>`)
    .join('');

  const rulesHtml = (report.claude_md_rules_to_add ?? [])
    .map((r) => `<li style="margin-bottom:12px"><strong>${r.section}:</strong> ${r.rule}<br><span style="color:#666;font-size:13px">${r.why}</span></li>`)
    .join('');

  const featuresHtml = (report.features_to_try ?? [])
    .map((f) => `<li style="margin-bottom:8px"><strong>${f.feature}</strong> — ${f.why}</li>`)
    .join('');

  const winsHtml = (report.wins ?? [])
    .map((w) => `<li style="margin-bottom:6px">${w}</li>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">

  <div style="background:#18181b;color:#fff;padding:24px;border-radius:12px;margin-bottom:24px">
    <div style="font-size:12px;color:#a1a1aa;margin-bottom:4px">WEEKLY CLAUDE CODE REPORT</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:8px">${weekLabel}</div>
    <div style="font-size:16px;color:#d4d4d8">${report.headline}</div>
  </div>

  <div style="display:flex;gap:16px;margin-bottom:24px">
    <div style="flex:1;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:700">${stats.total}</div>
      <div style="color:#666;font-size:13px">Sessions</div>
    </div>
    <div style="flex:1;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:700">${report.weekly_score?.goal_achievement ?? '—'}</div>
      <div style="color:#666;font-size:13px">Goal Achievement</div>
    </div>
    <div style="flex:1;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:700">${report.weekly_score?.satisfaction ?? '—'}</div>
      <div style="color:#666;font-size:13px">Satisfaction</div>
    </div>
    <div style="flex:1;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:700">${report.weekly_score?.trend === 'improving' ? '↑' : report.weekly_score?.trend === 'declining' ? '↓' : '→'}</div>
      <div style="color:#666;font-size:13px">${report.weekly_score?.trend ?? 'stable'}</div>
    </div>
  </div>

  <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px">
    <div style="font-size:12px;font-weight:600;color:#c2410c;margin-bottom:4px">THIS WEEK'S #1 PRIORITY</div>
    <div style="font-weight:500">${report.one_thing_to_fix}</div>
  </div>

  ${frictionRows ? `
  <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Top Friction Points</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead><tr style="background:#f4f4f5"><th style="padding:8px;text-align:left;font-size:12px;color:#666">Issue</th><th style="padding:8px;text-align:left;font-size:12px;color:#666">Frequency</th><th style="padding:8px;text-align:left;font-size:12px;color:#666">Impact</th></tr></thead>
    <tbody>${frictionRows}</tbody>
  </table>` : ''}

  ${winsHtml ? `
  <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">✅ What Worked</h2>
  <ul style="margin-bottom:24px;padding-left:20px">${winsHtml}</ul>` : ''}

  ${rulesHtml ? `
  <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">📋 Suggested CLAUDE.md Rules</h2>
  <ul style="margin-bottom:24px;padding-left:20px">${rulesHtml}</ul>` : ''}

  ${featuresHtml ? `
  <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">🚀 Features to Try</h2>
  <ul style="margin-bottom:24px;padding-left:20px">${featuresHtml}</ul>` : ''}

  <div style="border-top:1px solid #e4e4e7;padding-top:16px;font-size:12px;color:#71717a">
    Linus · BakedBot CTO &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</body>
</html>`;
}

// ── Save report ───────────────────────────────────────────────────────────────

function saveReport(report, stats, weekLabel, date) {
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const filename = `${date}-weekly-insights.json`;
  const path = join(REPORTS_DIR, filename);

  writeFileSync(path, JSON.stringify({ date, weekLabel, stats, report }, null, 2), 'utf8');
  console.log(`[Insights] Saved report: ${path}`);
  return path;
}

// ── Send email ────────────────────────────────────────────────────────────────

async function sendEmail(html, weekLabel) {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;

  if (!apiKey || !secretKey) {
    console.warn('[Insights] No MAILJET_API_KEY/MAILJET_SECRET_KEY — skipping email');
    return;
  }

  const client = new Mailjet({ apiKey, apiSecret: secretKey });
  await client.post('send', { version: 'v3.1' }).request({
    Messages: [{
      From: { Email: SENDER_EMAIL, Name: SENDER_NAME },
      To: [{ Email: RECIPIENT_EMAIL, Name: 'Martez' }],
      Subject: `Claude Code Weekly Report — ${weekLabel}`,
      HTMLPart: html,
    }],
  });

  console.log(`[Insights] Email sent to ${RECIPIENT_EMAIL}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const weekLabel = `Week of ${weekStart}`;

  console.log(`[Insights] Generating ${LOOKBACK_DAYS}-day report (${weekLabel})${DRY_RUN ? ' — DRY RUN' : ''}`);

  const facets = loadRecentFacets();
  console.log(`[Insights] Loaded ${facets.length} session facets`);

  if (facets.length === 0) {
    console.log('[Insights] No sessions found — nothing to report');
    return;
  }

  const stats = aggregateFacets(facets);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Insights] ANTHROPIC_API_KEY (or CLAUDE_API_KEY) not set');
    process.exit(1);
  }

  console.log('[Insights] Running Claude Haiku analysis...');
  const report = await analyzeWithClaude(stats, facets);

  console.log(`\n📊 ${weekLabel}\n${report.headline}\n`);
  console.log(`🔴 Fix this week: ${report.one_thing_to_fix}\n`);

  const savedPath = saveReport(report, stats, weekLabel, today);

  const html = buildEmailHtml(report, stats, weekLabel);

  if (DRY_RUN) {
    console.log('[Insights] DRY RUN — skipping email send');
    console.log('\nReport preview:\n', JSON.stringify(report, null, 2));
    return;
  }

  await sendEmail(html, weekLabel);

  console.log(`\n[Insights] Done. Report saved: ${savedPath}`);
}

main().catch((e) => { console.error('[Insights] Fatal:', e); process.exit(1); });
