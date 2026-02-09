#!/usr/bin/env tsx
/**
 * Script: Set Intern Role
 *
 * Quick script to set a user's role to 'intern' for training access.
 *
 * Usage:
 *   npx tsx scripts/set-intern-role.ts user@example.com
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

async function setInternRole(email: string) {
    try {
        const auth = initializeFirebase();

        // Get user by email
        const user = await auth.getUserByEmail(email);

        console.log(`Found user: ${user.email} (${user.uid})`);

        // Set custom claims
        await auth.setCustomUserClaims(user.uid, {
            role: 'intern',
            enrollmentDate: new Date().toISOString(),
        });

        console.log('✅ Successfully set role to "intern"');
        console.log('⚠️  User must sign out and back in for changes to take effect');

        // Verify claims were set
        const updatedUser = await auth.getUser(user.uid);
        console.log('\nCurrent custom claims:', updatedUser.customClaims);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.error('Usage: npx tsx scripts/set-intern-role.ts user@example.com');
    process.exit(1);
}

setInternRole(email);
