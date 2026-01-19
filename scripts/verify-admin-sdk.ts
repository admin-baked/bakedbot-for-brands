
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// MONKEY PATCH: Time Travel to 2025 to fix "Invalid JWT Signature" if clock is ahead
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const OriginalDate = Date;
const OriginalDateNow = Date.now;

class PatchedDate extends OriginalDate {
    constructor(...args: any[]) {
        if (args.length === 0) {
            // new Date() -> Time Travel
            super(OriginalDateNow() - ONE_YEAR_MS);
        } else {
            // new Date(value) -> Normal
            super(...(args as [any]));
        }
    }
}
// Override Date.now() too
PatchedDate.now = () => OriginalDateNow() - ONE_YEAR_MS;

// Force global override
global.Date = PatchedDate as any;

console.log('Time Travel Engaged (Global Date Patched)');
console.log('New "Now":', new Date().toISOString());

async function main() {
    console.log('Verifying Admin SDK Connectivity (ADC Mode)...');
    try {
        // 1. Initialize App with ADC
        const app = getApps().length > 0 ? getApps()[0] : initializeApp({
            credential: applicationDefault(),
            projectId: 'studio-567050101-bc6e8'
        });
        const auth = getAuth(app);
        const firestore = getFirestore(app);

        console.log('SDK Initialized with ADC.');

        // 2. Test Listing Users (Read)
        console.log('Attempting to list users...');
        const result = await auth.listUsers(1);
        console.log(`Success! Found ${result.users.length} users.`);
        if (result.users.length > 0) {
            console.log('Sample user:', result.users[0].uid);
        }

        // 3. Test Token Generation
        console.log('Attempting to create custom token...');
        const token = await auth.createCustomToken('test-uid-123', { role: 'test' });
        console.log('Token generated successfully.');
        // Decode token locally to check timestamps
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('Token Payload:', JSON.stringify(payload, null, 2));
        }

    } catch (e: any) {
        console.error('Verification Failed:', e);
        if (e.errorInfo) console.error('Error Info:', e.errorInfo);
    }
}

main().catch(console.error);
