
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function test() {
    console.log('--- Starting Secret Test ---');
    
    // Import the function after env is loaded
    const { getSecret } = await import('../src/server/utils/secrets');
    
    console.log('Testing non-existent secret (should timeout or fail gracefully)...');
    const start = Date.now();
    const secret = await getSecret('NON_EXISTENT_SECRET_FOR_TESTING');
    const duration = Date.now() - start;
    
    console.log('Result:', secret);
    console.log('Duration:', duration, 'ms');
    
    if (duration > 4000 && duration < 6000) {
        console.log('✅ Timeout logic worked (took ~5s)');
    } else if (duration < 1000) {
        console.log('✅ Fast fail (failed immediately which is also acceptable if network is dead)');
    } else {
        console.log('❌ Unexpected duration:', duration);
    }

    console.log('--- Test Complete ---');
}

test().catch(console.error);
