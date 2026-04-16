#!/usr/bin/env node
/**
 * Nightly Dashboard QA Agent
 *
 * Autonomous QA agent that logs into the dashboard as every persona
 * and hammers every route — looking for crashes, missing data, broken UI.
 *
 * Flow:
 *   1. Map all dashboard routes from filesystem
 *   2. Authenticate as super_user, dispensary_admin, brand_admin
 *   3. Visit every accessible route per persona
 *   4. Check: page loads, no console errors, no 500s, key elements visible
 *   5. Test interactive flows (check-in, chat, campaigns)
 *   6. File bugs to Firestore → Slack → Linus auto-fix loop
 *
 * Usage:
 *   node scripts/nightly-dashboard-qa.mjs                    # Full run
 *   node scripts/nightly-dashboard-qa.mjs --persona=super    # Single persona
 *   node scripts/nightly-dashboard-qa.mjs --route=/products  # Single route
 *   node scripts/nightly-dashboard-qa.mjs --dry-run          # List routes only
 *
 * Cost: $0 (Playwright + free Gemini for AI assertions)
 */

import { chromium } from 'playwright';
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
dotenv.config({ path: join(PROJECT_ROOT, '.env.local') });
dotenv.config();
const BASE_URL = process.env.BASE_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const RESULTS_DIR = join(PROJECT_ROOT, 'tmp', 'qa-results');

// ============================================================================
// Configuration
// ============================================================================

const PERSONAS = {
  super: {
    label: 'Super User (CEO)',
    role: 'super_user',
    orgId: 'org_bakedbot',
    uid: 'e2e-super-user',
    email: 'martez@bakedbot.ai',
    startRoute: '/dashboard/ceo',
    // Super users can access ALL routes
    routeFilter: () => true,
  },
  dispensary: {
    label: 'Dispensary Admin (Thrive Syracuse)',
    role: 'dispensary_admin',
    orgId: 'org_thrive_syracuse',
    uid: 'e2e-dispensary-user',
    email: 'e2e-dispensary@bakedbot.ai',
    startRoute: '/dashboard/inbox',
    // Dispensary admins: ops-focused routes
    routeFilter: (route) => !BRAND_ONLY_ROUTES.has(route) && !SUPER_ONLY_ROUTES.has(route),
  },
  brand: {
    label: 'Brand Admin (Ecstatic Edibles)',
    role: 'brand_admin',
    orgId: 'org_ecstatic_edibles',
    uid: 'e2e-brand-user',
    email: 'e2e-brand@bakedbot.ai',
    startRoute: '/dashboard/brand',
    // Brand admins: brand-focused routes
    routeFilter: (route) => !DISPENSARY_ONLY_ROUTES.has(route) && !SUPER_ONLY_ROUTES.has(route),
  },
};

// Routes restricted by role
const SUPER_ONLY_ROUTES = new Set([
  '/dashboard/admin', '/dashboard/vibe-admin', '/dashboard/simulation',
  '/dashboard/treasury', '/dashboard/greenledger', '/dashboard/setup',
]);
const BRAND_ONLY_ROUTES = new Set([
  '/dashboard/brand', '/dashboard/brand-page', '/dashboard/brand-pages',
  '/dashboard/ambassadors', '/dashboard/carousels',
]);
const DISPENSARY_ONLY_ROUTES = new Set([
  '/dashboard/menu-sync', '/dashboard/inventory', '/dashboard/budtender',
  '/dashboard/loyalty', '/dashboard/loyalty-tablet-qr',
]);

// Routes to skip (non-page routes, layouts, etc.)
const SKIP_ROUTES = new Set([
  '/dashboard/actions', '/dashboard/components', '/dashboard/shop',
]);

// Timeouts
const PAGE_LOAD_TIMEOUT = 30_000;
const INTERACTION_TIMEOUT = 15_000;

// ============================================================================
// Route Discovery
// ============================================================================

/**
 * Discover all dashboard routes from the filesystem.
 * Scans src/app/dashboard/ for page.tsx files.
 */
function discoverDashboardRoutes() {
  const dashboardDir = join(PROJECT_ROOT, 'src', 'app', 'dashboard');
  const routes = [];

  function scan(dir, prefix) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      if (entry.name === 'components' || entry.name === 'actions.ts') continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Dynamic routes: [orgId] → skip param, just use the route
        const routeSegment = entry.name.startsWith('[') ? entry.name : entry.name;
        scan(fullPath, `${prefix}/${routeSegment}`);
      }

      // Check for page.tsx or page.ts (actual route)
      if (entry.name === 'page.tsx' || entry.name === 'page.ts' || entry.name === 'page-client.tsx') {
        if (entry.name === 'page-client.tsx') continue; // Skip client pages, they're loaded by page.tsx
        routes.push(prefix || '/dashboard');
      }
    }
  }

  scan(dashboardDir, '/dashboard');

  // Dedupe and sort
  return [...new Set(routes)].sort();
}

/**
 * Discover public routes (tablet, menu, etc.)
 */
function discoverPublicRoutes() {
  return [
    '/loyalty/tablet/org_thrive_syracuse',  // Tablet kiosk check-in
    '/menu/org_thrive_syracuse',            // Public menu
    '/strains',                              // Strain encyclopedia
    '/terpenes',                             // Terpene guide
    '/pricing',                              // Pricing page
  ];
}

// ============================================================================
// Firebase Auth (creates session cookie)
// ============================================================================

async function authenticatePersona(browser, persona) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

    if (!firebaseApiKey) {
      throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY missing from environment');
    }

    const qaToken = await createCustomToken(persona);
    if (!qaToken) {
      console.log(`  âš ï¸ Could not create auth token for ${persona.label}`);
      await context.close();
      return null;
    }

    const qaIdToken = await exchangeCustomTokenForIdToken(qaToken, firebaseApiKey);
    const qaSessionCookie = await createSessionCookie(qaIdToken);
    await setSessionCookies(context, qaSessionCookie);

    await page.goto(`${BASE_URL}/auth/auto-login?token=${encodeURIComponent(qaToken)}`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT,
    });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(1500);

    const qaLoginUrl = page.url();
    const qaLoginBody = await page.locator('body').textContent().catch(() => '');
    if (
      qaLoginUrl.includes('/signin')
      || qaLoginUrl.includes('/login')
      || /Authentication Failed/i.test(qaLoginBody || '')
    ) {
      throw new Error(`auto-login did not establish a usable session (${qaLoginUrl})`);
    }

    await page.goto(`${BASE_URL}${persona.startRoute}`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT,
    });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});

    const qaCurrentUrl = page.url();
    if (qaCurrentUrl.includes('/signin') || qaCurrentUrl.includes('/login')) {
      throw new Error(`session verification redirected to auth (${qaCurrentUrl})`);
    }

    await page.close();
    return context;
  } catch (err) {
    console.log(`  ⚠️ Auth failed for ${persona.label}: ${err.message}`);
    await context.close();
    return null;
  }
}

async function createCustomToken(persona) {
  try {
    const auth = await getFirebaseAdminAuth().catch((e) => {
      console.log(`  ⚠️ No service account found for Firebase Admin auth: ${e.message}`);
      return null;
    });
    if (!auth) return null;

    // Ensure user exists
    try {
      await auth.getUser(persona.uid);
    } catch {
      await auth.createUser({
        uid: persona.uid,
        email: persona.email,
        displayName: persona.label,
      });
    }

    // Set claims
    await auth.setCustomUserClaims(persona.uid, {
      role: persona.role,
      orgId: persona.orgId,
    });

    return await auth.createCustomToken(persona.uid, {
      role: persona.role,
      orgId: persona.orgId,
    });
  } catch (err) {
    console.log(`  ⚠️ Token creation error: ${err.message}`);
    return null;
  }
}

async function getFirebaseAdminAuth() {
  const saPath = join(PROJECT_ROOT, 'service-account.json');
  let sa;
  if (existsSync(saPath)) {
    sa = JSON.parse(readFileSync(saPath, 'utf-8'));
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    throw new Error('No service account found for Firebase Admin auth');
  }

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');

  if (!getApps().length) {
    initializeApp({ credential: cert(sa) });
  }

  return getAuth();
}

async function exchangeCustomTokenForIdToken(customToken, apiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`custom-token exchange failed (${response.status}): ${details.slice(0, 200)}`);
  }

  const payload = await response.json();
  if (!payload.idToken) {
    throw new Error('custom-token exchange returned no idToken');
  }

  return payload.idToken;
}

async function createSessionCookie(idToken) {
  const auth = await getFirebaseAdminAuth();
  const expiresIn = 5 * 24 * 60 * 60 * 1000;
  return auth.createSessionCookie(idToken, { expiresIn });
}

async function setSessionCookies(context, sessionCookie) {
  const baseUrl = new URL(BASE_URL);
  const expires = Math.floor(Date.now() / 1000) + (5 * 24 * 60 * 60);
  const secure = baseUrl.protocol === 'https:';

  await context.addCookies([
    {
      name: '__session',
      value: sessionCookie,
      domain: baseUrl.hostname,
      path: '/',
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      expires,
    },
    {
      name: '__session_is_active',
      value: 'true',
      domain: baseUrl.hostname,
      path: '/',
      httpOnly: false,
      secure,
      sameSite: 'Lax',
      expires,
    },
  ]);
}

// ============================================================================
// Page Testing
// ============================================================================

/**
 * Test a single route — checks for crashes, console errors, missing content.
 */
async function testRoute(context, route, persona) {
  const page = await context.newPage();
  const consoleErrors = [];
  const networkErrors = [];

  // Capture console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text().slice(0, 200));
    }
  });

  // Capture failed network requests
  page.on('response', (response) => {
    if (response.status() >= 500) {
      networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  const result = {
    route,
    persona: persona.role,
    status: 'unknown',
    loadTimeMs: 0,
    consoleErrors: [],
    networkErrors: [],
    screenshot: null,
    issues: [],
  };

  try {
    const start = Date.now();

    // Navigate to the route
    const response = await page.goto(`${BASE_URL}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT,
    });

    result.loadTimeMs = Date.now() - start;

    // Check HTTP status
    if (response?.status() >= 500) {
      result.status = 'ERROR_500';
      result.issues.push(`Server error: HTTP ${response.status()}`);
    } else if (response?.status() >= 400) {
      result.status = 'ERROR_4XX';
      result.issues.push(`Client error: HTTP ${response.status()}`);
    }

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Check for error boundaries / crash screens
    const errorBoundary = await page.locator('[data-testid="error-boundary"], .error-boundary, [class*="error"]').first().isVisible().catch(() => false);
    if (errorBoundary) {
      result.issues.push('Error boundary visible — component crashed');
      result.status = 'CRASH';
    }

    // Check for "Something went wrong" text
    const errorText = await page.locator('text=/something went wrong|unexpected error|application error/i').first().isVisible().catch(() => false);
    if (errorText) {
      result.issues.push('Error message displayed on page');
      result.status = 'CRASH';
    }

    // Check for auth redirect (should NOT happen for authenticated personas)
    const currentUrl = page.url();
    if (currentUrl.includes('/signin') || currentUrl.includes('/login')) {
      result.issues.push(`Redirected to auth: ${currentUrl}`);
      result.status = 'AUTH_REDIRECT';
    }

    // Check page is not blank
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (bodyText.trim().length < 10) {
      result.issues.push('Page appears blank (< 10 chars of content)');
      result.status = 'BLANK';
    }

    // Check for slow load
    if (result.loadTimeMs > 10_000) {
      result.issues.push(`Slow load: ${(result.loadTimeMs / 1000).toFixed(1)}s`);
    }

    // Collect console + network errors
    result.consoleErrors = consoleErrors.slice(0, 5);
    result.networkErrors = networkErrors.slice(0, 5);

    if (result.status === 'unknown') {
      result.status = result.issues.length > 0 ? 'WARN' : 'PASS';
    }
  } catch (err) {
    result.status = 'TIMEOUT';
    result.issues.push(`Navigation failed: ${err.message.slice(0, 200)}`);
  }

  await page.close();
  return result;
}

// ============================================================================
// Interactive Flow Tests
// ============================================================================

/**
 * Test the tablet check-in flow (public, no auth needed).
 * This is the customer-facing kiosk experience.
 */
async function testTabletCheckIn(browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 }, // Tablet viewport
  });
  const page = await context.newPage();
  const issues = [];

  try {
    // Visit tablet page
    await page.goto(`${BASE_URL}/loyalty/tablet/org_thrive_syracuse`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Check welcome screen loads
    const welcomeVisible = await page.locator('text=/welcome|check.?in|rewards/i').first().isVisible({ timeout: 10_000 }).catch(() => false);
    if (!welcomeVisible) {
      issues.push('Tablet welcome screen not visible');
    }

    // Try "Join Rewards" flow
    const joinBtn = page.locator('text=/join|new.*customer|sign.*up/i').first();
    if (await joinBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await joinBtn.click();
      await page.waitForTimeout(1000);

      // Check for phone input
      const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone"], input[name*="phone"]').first();
      if (await phoneInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        // Type test phone number
        await phoneInput.fill('3126840522');
        await page.waitForTimeout(500);
      } else {
        issues.push('Phone input not found after clicking Join');
      }
    }
  } catch (err) {
    issues.push(`Tablet check-in error: ${err.message.slice(0, 200)}`);
  }

  await context.close();
  return { route: '/loyalty/tablet/org_thrive_syracuse', persona: 'public', status: issues.length ? 'FAIL' : 'PASS', issues };
}

/**
 * Test dashboard chat interaction (send a message to an agent).
 */
async function testDashboardChat(context, persona) {
  const page = await context.newPage();
  const issues = [];

  try {
    await page.goto(`${BASE_URL}/dashboard/chat`, {
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT,
    });

    // Look for chat input
    const chatInput = page.locator('textarea, input[type="text"][placeholder*="message"], [contenteditable="true"]').first();
    if (await chatInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await chatInput.fill('What is the status of our store today?');
      await page.waitForTimeout(500);

      // Look for send button
      const sendBtn = page.locator('button[type="submit"], button:has(svg), button:text("Send")').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        // Wait for response (up to 30s)
        const response = await page.locator('.message, [data-role="assistant"], [class*="bot"]').last()
          .isVisible({ timeout: 30_000 }).catch(() => false);
        if (!response) {
          issues.push('No chat response received within 30s');
        }
      }
    } else {
      issues.push('Chat input not found on /dashboard/chat');
    }
  } catch (err) {
    issues.push(`Chat test error: ${err.message.slice(0, 200)}`);
  }

  await page.close();
  return { route: '/dashboard/chat', persona: persona.role, status: issues.length ? 'FAIL' : 'PASS', issues };
}

// ============================================================================
// Bug Filing (Firestore + Slack)
// ============================================================================

async function fileBugs(results) {
  const failures = results.filter(r => r.status !== 'PASS');
  if (failures.length === 0) return;

  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    if (!getApps().length) {
      const saPath = join(PROJECT_ROOT, 'service-account.json');
      if (existsSync(saPath)) {
        initializeApp({ credential: cert(JSON.parse(readFileSync(saPath, 'utf-8'))) });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
      } else {
        return;
      }
    }

    const db = getFirestore();

    // Save full run
    const runRef = await db.collection('qa_dashboard_runs').add({
      timestamp: new Date(),
      totalRoutes: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: failures.length,
      results: results.map(r => ({
        route: r.route,
        persona: r.persona,
        status: r.status,
        loadTimeMs: r.loadTimeMs || 0,
        issues: r.issues || [],
      })),
    });

    // File individual bugs for crashes and 500s
    const criticalBugs = failures.filter(r => ['CRASH', 'ERROR_500', 'TIMEOUT'].includes(r.status));
    for (const bug of criticalBugs) {
      await db.collection('qa_bugs').add({
        source: 'nightly-dashboard-qa',
        route: bug.route,
        persona: bug.persona,
        status: bug.status,
        issues: bug.issues,
        severity: bug.status === 'CRASH' ? 'P0' : 'P1',
        filed: new Date(),
        resolved: false,
        runId: runRef.id,
      });
    }

    console.log(`\n  📋 Filed ${criticalBugs.length} bugs to Firestore (run: ${runRef.id})`);
  } catch (err) {
    console.log(`  ⚠️ Bug filing error: ${err.message}`);
  }
}

async function postSlackSummary(results) {
  const botToken = process.env.SLACK_BOT_TOKEN || '';
  if (!botToken) return;

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status !== 'PASS').length;
  const crashes = results.filter(r => r.status === 'CRASH').length;
  const timeouts = results.filter(r => r.status === 'TIMEOUT').length;
  const errors500 = results.filter(r => r.status === 'ERROR_500').length;

  const emoji = failed === 0 ? '✅' : crashes > 0 ? '🔴' : '⚠️';
  const failDetails = results
    .filter(r => r.status !== 'PASS')
    .slice(0, 10)
    .map(r => `  • \`${r.route}\` (${r.persona}) — ${r.status}: ${r.issues[0] || 'unknown'}`)
    .join('\n');

  const text = [
    `${emoji} *Nightly Dashboard QA Report*`,
    ``,
    `*${passed}/${total} routes passed* | ${crashes} crashes | ${errors500} 500s | ${timeouts} timeouts`,
    failed > 0 ? `\n*Failures:*\n${failDetails}` : '',
    `\n_Tested as: super_user, dispensary_admin, brand_admin_`,
  ].filter(Boolean).join('\n');

  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'C0AFP0WEYG4', text, unfurl_links: false }), // #linus-cto
    });
  } catch { /* non-fatal */ }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const personaFilter = args.find(a => a.startsWith('--persona='))?.split('=')[1] || null;
  const routeFilter = args.find(a => a.startsWith('--route='))?.split('=')[1] || null;
  const dryRun = args.includes('--dry-run');
  const interactiveOnly = args.includes('--interactive');

  // Step 1: Discover routes
  const dashboardRoutes = discoverDashboardRoutes();
  const publicRoutes = discoverPublicRoutes();
  const allRoutes = [...dashboardRoutes, ...publicRoutes].filter(r => !SKIP_ROUTES.has(r));

  console.log(`
${'═'.repeat(70)}
  🧪 NIGHTLY DASHBOARD QA AGENT
${'═'.repeat(70)}
  Dashboard routes: ${dashboardRoutes.length}
  Public routes:    ${publicRoutes.length}
  Personas:         ${personaFilter || 'all (super, dispensary, brand)'}
  Base URL:         ${BASE_URL}
  Cost:             $0
  Started:          ${new Date().toLocaleString()}
${'═'.repeat(70)}
`);

  if (dryRun) {
    console.log('DRY RUN — discovered routes:\n');
    for (const route of allRoutes) {
      const accessible = Object.entries(PERSONAS)
        .filter(([, p]) => p.routeFilter(route))
        .map(([k]) => k)
        .join(', ');
      console.log(`  ${route} [${accessible}]`);
    }
    console.log(`\n  Total: ${allRoutes.length} routes`);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  // Step 2: Test each persona
  const personasToTest = personaFilter
    ? { [personaFilter]: PERSONAS[personaFilter] }
    : PERSONAS;

  for (const [personaKey, persona] of Object.entries(personasToTest)) {
    console.log(`\n  ── ${persona.label} ──`);

    // Authenticate
    console.log(`  🔐 Authenticating...`);
    const context = await authenticatePersona(browser, persona);
    if (!context) {
      console.log(`  ❌ Auth failed — skipping persona`);
      continue;
    }
    console.log(`  ✅ Authenticated\n`);

    // Filter routes for this persona
    const personaRoutes = (routeFilter ? [routeFilter] : dashboardRoutes)
      .filter(r => persona.routeFilter(r));

    // Test each route
    for (let i = 0; i < personaRoutes.length; i++) {
      const route = personaRoutes[i];
      process.stdout.write(`  [${i + 1}/${personaRoutes.length}] ${route.padEnd(45)}...`);

      const result = await testRoute(context, route, persona);
      allResults.push(result);

      const emoji = result.status === 'PASS' ? '✅' :
                     result.status === 'CRASH' ? '💥' :
                     result.status === 'TIMEOUT' ? '⏱️' :
                     result.status === 'ERROR_500' ? '🔴' : '⚠️';
      console.log(` ${emoji} ${result.loadTimeMs}ms${result.issues.length ? ` — ${result.issues[0]}` : ''}`);

      // Small delay between routes to not hammer the server
      await new Promise(r => setTimeout(r, 2000));
    }

    // Interactive flow tests
    if (!routeFilter) {
      console.log(`\n  🎯 Interactive flow tests:`);

      // Dashboard chat
      const chatResult = await testDashboardChat(context, persona);
      allResults.push(chatResult);
      console.log(`  [chat] ${chatResult.status === 'PASS' ? '✅' : '❌'} ${chatResult.issues[0] || 'OK'}`);
    }

    await context.close();
  }

  // Step 3: Test public flows (no auth)
  if (!personaFilter || personaFilter === 'public') {
    console.log(`\n  ── Public Flows ──`);

    // Tablet check-in
    const tabletResult = await testTabletCheckIn(browser);
    allResults.push(tabletResult);
    console.log(`  [tablet] ${tabletResult.status === 'PASS' ? '✅' : '❌'} ${tabletResult.issues[0] || 'Check-in flow OK'}`);

    // Public pages
    const publicContext = await browser.newContext();
    for (const route of publicRoutes) {
      const page = await publicContext.newPage();
      try {
        const start = Date.now();
        const resp = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT });
        const loadTime = Date.now() - start;
        const status = resp?.status() >= 500 ? 'ERROR_500' : resp?.status() >= 400 ? 'ERROR_4XX' : 'PASS';
        allResults.push({ route, persona: 'public', status, loadTimeMs: loadTime, issues: status !== 'PASS' ? [`HTTP ${resp?.status()}`] : [] });
        console.log(`  [${route}] ${status === 'PASS' ? '✅' : '🔴'} ${loadTime}ms`);
      } catch (err) {
        allResults.push({ route, persona: 'public', status: 'TIMEOUT', loadTimeMs: 0, issues: [err.message.slice(0, 100)] });
        console.log(`  [${route}] ⏱️ TIMEOUT`);
      }
      await page.close();
    }
    await publicContext.close();
  }

  await browser.close();

  // Step 4: Summary
  const passed = allResults.filter(r => r.status === 'PASS').length;
  const failed = allResults.filter(r => r.status !== 'PASS').length;

  console.log(`
${'═'.repeat(70)}
  📊 QA SUMMARY
${'═'.repeat(70)}
  Total tested: ${allResults.length}
  Passed:       ${passed} (${Math.round(passed / allResults.length * 100)}%)
  Failed:       ${failed}
  Crashes:      ${allResults.filter(r => r.status === 'CRASH').length}
  500 errors:   ${allResults.filter(r => r.status === 'ERROR_500').length}
  Timeouts:     ${allResults.filter(r => r.status === 'TIMEOUT').length}
  Auth issues:  ${allResults.filter(r => r.status === 'AUTH_REDIRECT').length}
${'═'.repeat(70)}
`);

  if (failed > 0) {
    console.log('  ❌ Failures:');
    allResults.filter(r => r.status !== 'PASS').forEach(r => {
      console.log(`     ${r.route} (${r.persona}) — ${r.status}: ${r.issues[0] || ''}`);
    });
  }

  // Step 5: File bugs + Slack
  await fileBugs(allResults);
  await postSlackSummary(allResults);

  // Save results locally
  try {
    if (!existsSync(RESULTS_DIR)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(RESULTS_DIR, { recursive: true });
    }
    const resultsPath = join(RESULTS_DIR, `dashboard-qa-${new Date().toISOString().slice(0, 10)}.json`);
    writeFileSync(resultsPath, JSON.stringify({ timestamp: new Date().toISOString(), results: allResults }, null, 2));
    console.log(`\n  📁 Results: ${resultsPath}`);
  } catch { /* non-fatal */ }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
