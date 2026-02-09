#!/usr/bin/env tsx
/**
 * Script: Get User UID
 *
 * Quick script to get a user's UID from their email.
 *
 * Usage:
 *   npx tsx scripts/get-user-uid.ts user@example.com
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
function initializeFirebase() {
    if (getApps().length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKey) {
            // Try loading from local file
            try {
                const fs = require('fs');
                const path = require('path');
                const localSaPath = path.resolve(process.cwd(), 'service-account.json');
                if (fs.existsSync(localSaPath)) {
                    const serviceAccount = JSON.parse(fs.readFileSync(localSaPath, 'utf-8'));
                    initializeApp({ credential: cert(serviceAccount) });
                    return getAuth();
                }
            } catch (err) {
                // Continue to error below
            }

            throw new Error(
                'FIREBASE_SERVICE_ACCOUNT_KEY not found in environment.\n' +
                'Please set it in .env.local or create service-account.json'
            );
        }

        // Decode base64 service account
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountKey);
        } catch {
            serviceAccount = JSON.parse(
                Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
            );
        }

        initializeApp({ credential: cert(serviceAccount) });
    }

    return getAuth();
}

async function getUserUID(email: string) {
    try {
        const auth = initializeFirebase();

        // Get user by email
        const user = await auth.getUserByEmail(email);

        console.log('✅ User found:');
        console.log('   Email:', user.email);
        console.log('   UID:', user.uid);
        console.log('   Display Name:', user.displayName || '(not set)');
        console.log('   Created:', new Date(user.metadata.creationTime).toLocaleDateString());

        if (user.customClaims) {
            console.log('   Custom Claims:', JSON.stringify(user.customClaims, null, 2));
        } else {
            console.log('   Custom Claims: (none)');
        }

        console.log('\nTo set as intern, run:');
        console.log(`   npx tsx scripts/set-intern-role.ts ${email}`);

        process.exit(0);
    } catch (error) {
        if ((error as any).code === 'auth/user-not-found') {
            console.error('❌ User not found:', email);
            console.log('\nMake sure:');
            console.log('   1. Email is spelled correctly');
            console.log('   2. User has signed up at /training or /login');
        } else {
            console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        }
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.error('Usage: npx tsx scripts/get-user-uid.ts user@example.com');
    process.exit(1);
}

getUserUID(email);
