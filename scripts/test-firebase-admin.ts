import { createServerClient } from '../src/firebase/server-client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    try {
        console.log('Testing Firebase Admin initialization...');
        const { auth, firestore } = await createServerClient();
        console.log('✅ Firebase Admin initialized successfully.');

        // Try to list users (requires admin)
        const listUsersResult = await auth.listUsers(1);
        console.log(`✅ Successfully listed ${listUsersResult.users.length} users.`);

    } catch (error: any) {
        console.error('❌ Firebase Admin initialization failed:', error.message);
        process.exit(1);
    }
}

main();
