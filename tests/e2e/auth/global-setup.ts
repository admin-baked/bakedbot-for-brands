/**
 * Playwright Global Setup — Authenticates E2E test users
 *
 * Creates Firebase session cookies for 3 test personas:
 *   - super_user (Super Admin / CEO dashboard)
 *   - dispensary_admin (Thrive Syracuse)
 *   - brand_admin (Ecstatic Edibles)
 *
 * Saves storageState files per persona so tests can reuse auth.
 *
 * Flow:
 *   1. Firebase Admin SDK creates custom tokens (server-side)
 *   2. Playwright browser signs in via Firebase client SDK (browser-side)
 *   3. Gets ID token → POSTs to /api/auth/session → server sets __session cookie
 *   4. Saves cookies + localStorage to .auth/<persona>.json
 */

import { chromium, type FullConfig } from '@playwright/test';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = join(__dirname, '..', '..', '..');
const AUTH_DIR = join(__dirname, '.auth');
const BASE_URL = process.env.BASE_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ── Test personas ──────────────────────────────────────────────────────────

const PERSONAS = {
    super: {
        uid: 'e2e-super-user',
        email: 'martez@bakedbot.ai',
        displayName: 'E2E Super User',
        claims: { role: 'super_user', orgId: 'org_bakedbot' },
        storageFile: 'super.json',
    },
    dispensary: {
        uid: 'e2e-dispensary-user',
        email: 'e2e-dispensary@bakedbot.ai',
        displayName: 'E2E Thrive Manager',
        claims: { role: 'dispensary_admin', orgId: 'org_thrive_syracuse' },
        storageFile: 'dispensary.json',
    },
    brand: {
        uid: 'e2e-brand-user',
        email: 'e2e-brand@bakedbot.ai',
        displayName: 'E2E Ecstatic Brand',
        claims: { role: 'brand_admin', orgId: 'org_ecstatic_edibles' },
        storageFile: 'brand.json',
    },
};

// ── Firebase Admin init ────────────────────────────────────────────────────

function getFirebaseAdmin() {
    if (getApps().length) return getAuth();

    const saPath = join(PROJECT_ROOT, 'service-account.json');
    if (existsSync(saPath)) {
        const sa = JSON.parse(readFileSync(saPath, 'utf-8'));
        initializeApp({ credential: cert(sa) });
        return getAuth();
    }

    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (saKey) {
        initializeApp({ credential: cert(JSON.parse(saKey)) });
        return getAuth();
    }

    throw new Error(
        'Firebase credentials required for E2E auth setup. ' +
        'Place service-account.json in project root or set FIREBASE_SERVICE_ACCOUNT_KEY.'
    );
}

// ── Ensure user exists with correct claims ─────────────────────────────────

async function ensureUser(auth: ReturnType<typeof getAuth>, persona: typeof PERSONAS[keyof typeof PERSONAS]) {
    try {
        await auth.getUser(persona.uid);
    } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
            await auth.createUser({
                uid: persona.uid,
                email: persona.email,
                displayName: persona.displayName,
                emailVerified: true,
            });
        } else {
            throw err;
        }
    }
    await auth.setCustomUserClaims(persona.uid, persona.claims);
}

// ── Main setup ─────────────────────────────────────────────────────────────

async function globalSetup(config: FullConfig) {
    console.log('\n[E2E Auth Setup] Authenticating test personas...\n');

    // Ensure auth directory exists
    if (!existsSync(AUTH_DIR)) {
        mkdirSync(AUTH_DIR, { recursive: true });
    }

    const auth = getFirebaseAdmin();
    const browser = await chromium.launch();

    for (const [name, persona] of Object.entries(PERSONAS)) {
        const storagePath = join(AUTH_DIR, persona.storageFile);
        console.log(`  [${name}] ${persona.claims.role} @ ${persona.claims.orgId}`);

        try {
            // 1. Ensure user exists in Firebase Auth
            await ensureUser(auth, persona);

            // 2. Generate custom token
            const customToken = await auth.createCustomToken(persona.uid, persona.claims);
            console.log(`    Token generated (${customToken.length} chars)`);

            // 3. Use browser to authenticate and get session cookie
            const context = await browser.newContext();
            const page = await context.newPage();

            // Navigate to app first (needed for Firebase client SDK init)
            await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

            // Handle age gate if present
            const ageConfirm = page.locator('[data-testid="age-confirm"]');
            if (await ageConfirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
                await ageConfirm.click();
                await page.waitForLoadState('domcontentloaded');
            }

            // 4. Sign in with custom token and create session (all in-browser)
            const sessionResult = await page.evaluate(async (token: string) => {
                // Firebase client SDK should be loaded from the app
                const { initializeApp, getApps, getApp } = await import('firebase/app');
                const { getAuth: getClientAuth, signInWithCustomToken } = await import('firebase/auth');

                // Use the app's Firebase config
                const config = {
                    projectId: 'studio-567050101-bc6e8',
                    appId: '1:1016399212569:web:d9c43842ea4d824e13ba88',
                    apiKey: (window as any).__NEXT_DATA__?.runtimeConfig?.NEXT_PUBLIC_FIREBASE_API_KEY
                        || document.querySelector('script[src*="firebase"]')?.getAttribute('data-api-key')
                        || '', // Will be populated from env
                    authDomain: 'studio-567050101-bc6e8.firebaseapp.com',
                };

                // Check if the app's Firebase is already initialized
                let app;
                try {
                    app = getApps().length > 0 ? getApp() : initializeApp(config);
                } catch {
                    app = initializeApp(config, 'e2e-auth');
                }

                const auth = getClientAuth(app);

                // Sign in with custom token
                const userCredential = await signInWithCustomToken(auth, token);
                const idToken = await userCredential.user.getIdToken(true);

                // Create server session
                const res = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken }),
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Session creation failed: ${res.status} ${text}`);
                }

                return { success: true, uid: userCredential.user.uid };
            }, customToken);

            if (!sessionResult.success) {
                throw new Error('Session creation returned unsuccessful');
            }

            // 5. Save storage state (cookies + localStorage)
            await context.storageState({ path: storagePath });
            console.log(`    Session saved → ${persona.storageFile}`);

            await context.close();
        } catch (err: any) {
            console.error(`    FAILED: ${err.message}`);
            // Write empty storage state so tests can skip gracefully
            const emptyState = { cookies: [], origins: [] };
            const fs = await import('fs');
            fs.writeFileSync(storagePath, JSON.stringify(emptyState));
        }
    }

    await browser.close();
    console.log('\n[E2E Auth Setup] Complete.\n');
}

export default globalSetup;
