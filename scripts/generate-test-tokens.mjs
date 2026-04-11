#!/usr/bin/env node
/**
 * generate-test-tokens.mjs — Firebase Custom Token Generator for E2E Tests
 *
 * Generates Firebase custom tokens for test users across org types.
 * These tokens are used by Playwright's global-setup to authenticate
 * and create session cookies for dashboard testing.
 *
 * Usage:
 *   node scripts/generate-test-tokens.mjs                    # Generate all test user tokens
 *   node scripts/generate-test-tokens.mjs --user=super       # Generate for specific user
 *   node scripts/generate-test-tokens.mjs --output=json      # Output as JSON (for CI)
 *
 * Requires: service-account.json in project root OR FIREBASE_SERVICE_ACCOUNT_KEY env var
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ── Test User Profiles ─────────────────────────────────────────────────────
// These map to real Firestore user/org docs for E2E testing.

const TEST_USERS = {
    super: {
        uid: 'e2e-super-user',
        email: 'martez@bakedbot.ai',
        displayName: 'E2E Super User',
        claims: {
            role: 'super_user',
            orgId: 'org_bakedbot',
        },
        description: 'Super Admin — sees all orgs, CEO dashboard, admin panels',
    },
    dispensary: {
        uid: 'e2e-dispensary-user',
        email: 'e2e-dispensary@bakedbot.ai',
        displayName: 'E2E Thrive Manager',
        claims: {
            role: 'dispensary_admin',
            orgId: 'org_thrive_syracuse',
        },
        description: 'Dispensary Admin — Thrive Syracuse: Products, Menu, Analytics, POS',
    },
    brand: {
        uid: 'e2e-brand-user',
        email: 'e2e-brand@bakedbot.ai',
        displayName: 'E2E Ecstatic Brand',
        claims: {
            role: 'brand_admin',
            orgId: 'org_ecstatic_edibles',
        },
        description: 'Brand Admin — Ecstatic Edibles: Brand Page, Creative, Campaigns',
    },
};

// ── Firebase Admin Init ────────────────────────────────────────────────────

function initFirebase() {
    if (getApps().length) return getAuth();

    // Try local service account file first
    const saPath = join(PROJECT_ROOT, 'service-account.json');
    if (existsSync(saPath)) {
        const sa = JSON.parse(readFileSync(saPath, 'utf-8'));
        initializeApp({ credential: cert(sa) });
        return getAuth();
    }

    // Try env var
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (saKey) {
        const sa = JSON.parse(saKey);
        initializeApp({ credential: cert(sa) });
        return getAuth();
    }

    throw new Error(
        'No Firebase credentials found. Place service-account.json in project root ' +
        'or set FIREBASE_SERVICE_ACCOUNT_KEY env var.'
    );
}

// ── Ensure test users exist in Firebase Auth ───────────────────────────────

async function ensureTestUser(auth, profile) {
    try {
        // Try to get existing user
        await auth.getUser(profile.uid);
    } catch (err) {
        if (err.code === 'auth/user-not-found') {
            // Create the user
            await auth.createUser({
                uid: profile.uid,
                email: profile.email,
                displayName: profile.displayName,
                emailVerified: true,
            });
            console.log(`  Created Firebase Auth user: ${profile.uid}`);
        } else {
            throw err;
        }
    }

    // Always set custom claims to ensure they're current
    await auth.setCustomUserClaims(profile.uid, profile.claims);
}

// ── Generate custom tokens ─────────────────────────────────────────────────

async function generateTokens(targetUser) {
    const auth = initFirebase();
    const users = targetUser
        ? { [targetUser]: TEST_USERS[targetUser] }
        : TEST_USERS;

    if (!targetUser && !TEST_USERS[targetUser] && targetUser) {
        console.error(`Unknown user: ${targetUser}. Available: ${Object.keys(TEST_USERS).join(', ')}`);
        process.exit(1);
    }

    const tokens = {};

    for (const [key, profile] of Object.entries(users)) {
        console.log(`\n[${key}] ${profile.description}`);

        // Ensure user exists with correct claims
        await ensureTestUser(auth, profile);

        // Generate custom token
        const token = await auth.createCustomToken(profile.uid, profile.claims);
        tokens[key] = {
            token,
            uid: profile.uid,
            email: profile.email,
            role: profile.claims.role,
            orgId: profile.claims.orgId,
        };

        console.log(`  Token generated (${token.length} chars)`);
        console.log(`  UID: ${profile.uid} | Role: ${profile.claims.role} | Org: ${profile.claims.orgId}`);
    }

    return tokens;
}

// ── Main ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const TARGET_USER = args.find(a => a.startsWith('--user='))?.split('=')[1];
const OUTPUT_JSON = args.includes('--output=json');

try {
    console.log('=== BakedBot E2E Test Token Generator ===\n');
    const tokens = await generateTokens(TARGET_USER);

    if (OUTPUT_JSON) {
        // Machine-readable output for CI/Playwright
        console.log('\n--- JSON OUTPUT ---');
        console.log(JSON.stringify(tokens, null, 2));
    } else {
        console.log('\n=== Tokens Ready ===');
        console.log('Use with Playwright global-setup to authenticate test sessions.\n');
    }
} catch (err) {
    console.error('Fatal:', err.message);
    process.exit(1);
}
