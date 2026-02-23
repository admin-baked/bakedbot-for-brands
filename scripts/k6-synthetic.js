/**
 * BakedBot Synthetic Monitoring — k6 script
 *
 * Probes critical production endpoints every 15 minutes via GitHub Actions.
 * Enforces p95 < 600ms latency SLA and < 1% error rate.
 *
 * Run locally (requires k6 installed):
 *   k6 run scripts/k6-synthetic.js
 *
 * Endpoints tested:
 *   1. /api/health         — liveness + revision detection
 *   2. /thrivesyracuse     — ISR public menu (primary customer path)
 *   3. /llm.txt            — Agent web infrastructure
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────────────────────────────────
const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency', true);
const menuLatency = new Trend('menu_latency', true);
const llmTxtLatency = new Trend('llm_txt_latency', true);

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || 'https://bakedbot.ai';

export const options = {
  // Single VU — this is synthetic monitoring, not load testing.
  // We measure baseline latency for one real user path.
  vus: 1,
  iterations: 3, // 3 passes per run to get a stable p95 sample

  thresholds: {
    // Global p95 must be under 600ms
    http_req_duration: ['p(95)<600'],
    // Error rate must be under 1%
    http_req_failed: ['rate<0.01'],
    // Custom per-endpoint thresholds
    health_latency: ['p(95)<200'],   // health should be near-instant
    menu_latency: ['p(95)<600'],     // ISR menu page (cache hit path)
    llm_txt_latency: ['p(95)<600'],  // agent web endpoint
    errors: ['rate<0.01'],
  },
};

export default function () {
  // ── 1. Health check ──────────────────────────────────────────────────────
  const health = http.get(`${BASE_URL}/api/health`, {
    tags: { endpoint: 'health' },
  });

  healthLatency.add(health.timings.duration);

  const healthOk = check(health, {
    'health: status 200': (r) => r.status === 200,
    'health: has status field': (r) => {
      try { return JSON.parse(r.body).status === 'ok'; } catch { return false; }
    },
    'health: has revision field': (r) => {
      try { return !!JSON.parse(r.body).revision; } catch { return false; }
    },
    'health: p95 < 200ms': (r) => r.timings.duration < 200,
  });

  if (!healthOk) errorRate.add(1);
  else errorRate.add(0);

  sleep(1);

  // ── 2. Public menu (ISR) ─────────────────────────────────────────────────
  const menu = http.get(`${BASE_URL}/thrivesyracuse`, {
    tags: { endpoint: 'menu' },
    headers: {
      // Simulate real browser request for accurate ISR cache measurement
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'BakedBot-Synthetic/1.0',
    },
  });

  menuLatency.add(menu.timings.duration);

  const menuOk = check(menu, {
    'menu: status 200': (r) => r.status === 200,
    'menu: has html content': (r) => r.body.includes('<!DOCTYPE html') || r.body.includes('<html'),
    'menu: p95 < 600ms': (r) => r.timings.duration < 600,
  });

  if (!menuOk) errorRate.add(1);
  else errorRate.add(0);

  sleep(1);

  // ── 3. LLM.txt / Agent web ───────────────────────────────────────────────
  const llmTxt = http.get(`${BASE_URL}/llm.txt`, {
    tags: { endpoint: 'llm_txt' },
    headers: {
      'User-Agent': 'BakedBot-Synthetic/1.0',
    },
  });

  llmTxtLatency.add(llmTxt.timings.duration);

  const llmTxtOk = check(llmTxt, {
    'llm.txt: status 200': (r) => r.status === 200,
    'llm.txt: has content': (r) => r.body.length > 0,
    'llm.txt: p95 < 600ms': (r) => r.timings.duration < 600,
  });

  if (!llmTxtOk) errorRate.add(1);
  else errorRate.add(0);

  sleep(1);
}

export function handleSummary(data) {
  const passed = data.metrics.http_req_failed.values.rate < 0.01;
  const p95 = data.metrics.http_req_duration.values['p(95)'];
  const healthP95 = data.metrics.health_latency?.values['p(95)'] || 0;
  const menuP95 = data.metrics.menu_latency?.values['p(95)'] || 0;
  const llmP95 = data.metrics.llm_txt_latency?.values['p(95)'] || 0;

  const summary = {
    passed,
    p95_ms: Math.round(p95),
    sla_threshold_ms: 600,
    endpoints: {
      health: { p95_ms: Math.round(healthP95), threshold_ms: 200 },
      menu: { p95_ms: Math.round(menuP95), threshold_ms: 600 },
      llm_txt: { p95_ms: Math.round(llmP95), threshold_ms: 600 },
    },
    timestamp: new Date().toISOString(),
  };

  // Write JSON summary for GitHub Actions to read
  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'scripts/k6-summary.json': JSON.stringify(summary),
  };
}
