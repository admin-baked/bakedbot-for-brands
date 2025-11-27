#!/usr/bin/env node
// scripts/verify-secrets.mjs
// Verifies that all required secrets exist in Google Cloud Secret Manager

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { parse } from 'yaml';

const REQUIRED_SECRETS = [
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'SENDGRID_API_KEY',
    'RECAPTCHA_SECRET_KEY',
    'CANNMENUS_API_KEY',
    'AUTHNET_API_LOGIN_ID',
    'AUTHNET_TRANSACTION_KEY',
    'NEXT_PUBLIC_AUTHNET_CLIENT_KEY',
    'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
    'CLAUDE_API_KEY',
];

console.log('🔐 Verifying Google Cloud Secrets...\n');

// Parse apphosting.yaml to get project ID
let projectId;
try {
    const fbrc = JSON.parse(readFileSync('.firebaserc', 'utf-8'));
    projectId = fbrc.projects?.default;

    if (!projectId) {
        console.error('❌ Could not find project ID in .firebaserc');
        process.exit(1);
    }

    console.log(`Project: ${projectId}\n`);
} catch (error) {
    console.error('❌ Error reading .firebaserc:', error.message);
    process.exit(1);
}

let missingSecrets = [];
let foundSecrets = [];
let inaccessibleSecrets = [];

// Check each secret
for (const secretName of REQUIRED_SECRETS) {
    try {
        // Try to access the latest version of the secret
        const command = `gcloud secrets versions access latest --secret="${secretName}" --project="${projectId}" 2>&1`;

        try {
            execSync(command, { stdio: 'pipe' });
            foundSecrets.push(secretName);
            console.log(`✅ ${secretName}`);
        } catch (accessError) {
            const errorOutput = accessError.stderr?.toString() || accessError.stdout?.toString() || '';

            if (errorOutput.includes('NOT_FOUND') || errorOutput.includes('not found')) {
                missingSecrets.push(secretName);
                console.log(`❌ ${secretName} - NOT FOUND`);
            } else if (errorOutput.includes('PERMISSION_DENIED')) {
                inaccessibleSecrets.push(secretName);
                console.log(`⚠️  ${secretName} - PERMISSION DENIED`);
            } else {
                inaccessibleSecrets.push(secretName);
                console.log(`⚠️  ${secretName} - ERROR: ${errorOutput.split('\n')[0]}`);
            }
        }
    } catch (error) {
        console.error(`⚠️  ${secretName} - Unexpected error:`, error.message);
        inaccessibleSecrets.push(secretName);
    }
}

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log('Summary:');
console.log(`✅ Found: ${foundSecrets.length}/${REQUIRED_SECRETS.length}`);
if (missingSecrets.length > 0) {
    console.log(`❌ Missing: ${missingSecrets.length}`);
    console.log(`   ${missingSecrets.join(', ')}`);
}
if (inaccessibleSecrets.length > 0) {
    console.log(`⚠️  Inaccessible: ${inaccessibleSecrets.length}`);
    console.log(`   ${inaccessibleSecrets.join(', ')}`);
}
console.log(`${'='.repeat(60)}\n`);

// Exit with error if any secrets are missing
if (missingSecrets.length > 0) {
    console.error('❌ Some secrets are missing. Please create them in Google Cloud Secret Manager.');
    console.error(`\nTo create a secret, run:`);
    console.error(`  echo -n "YOUR_SECRET_VALUE" | gcloud secrets create SECRET_NAME --data-file=- --project=${projectId}`);
    process.exit(1);
}

if (inaccessibleSecrets.length > 0 && missingSecrets.length === 0) {
    console.warn('⚠️  Some secrets are inaccessible. Check your permissions.');
    process.exit(0); // Don't fail if just permission issues
}

console.log('✅ All required secrets are configured!\n');
process.exit(0);
