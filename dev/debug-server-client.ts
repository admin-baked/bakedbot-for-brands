
import { createServerClient } from '../src/firebase/server-client';

async function testServerClient() {
    console.log('--- Testing server-client.ts Logic ---');
    try {
        const { auth } = await createServerClient();
        console.log('✅ Client created.');
        console.log('App Name:', auth.app.name);
        console.log('Project ID:', auth.app.options.projectId);
        
        console.log('Attempting getUserByEmail (Network Call)...');
        // Use the client_email from the key, or a dummy one, or fail intentionally to check auth
        // Let's try to verify the service account's own email if possible, or just a random one.
        // Actually, let's just create a custom token, that's local signing.
        // The ERROR reported is 'failed to fetch a valid Google OAuth2 access token'.
        // This happens when fetching data.
        
        try {
            await auth.listUsers(1); 
            console.log('✅ listUsers success! Auth is working.');
        } catch (e: any) {
            console.error('❌ listUsers failed:', e.code, e.message);
        }

    } catch (e: any) {
        console.error('❌ createServerClient failed:', e);
    }
}

testServerClient();
