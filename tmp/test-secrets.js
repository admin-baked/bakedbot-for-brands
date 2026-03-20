
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

async function test() {
    console.log('--- Starting Secret Test (JS) ---');
    
    // We can't easily import ESM from CJS here without dynamic import and a tool that supports it
    // But we can test the LOGIC by mocking the parts if needed.
    // However, I want to test the ACTUAL file.
    
    // Let's try to just run the relevant logic block here manually
    
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (saKey) {
        try {
            const decoded = JSON.parse(Buffer.from(saKey, 'base64').toString('utf8'));
            console.log('Extracted project_id:', decoded.project_id);
            if (decoded.project_id === 'studio-567050101-bc6e8') {
                console.log('✅ Extraction Test Passed');
            } else {
                console.log('❌ Extraction Test Failed:', decoded.project_id);
            }
        } catch (e) {
            console.error('Failed to parse SA key:', e.message);
        }
    } else {
        console.log('❌ FIREBASE_SERVICE_ACCOUNT_KEY missing from env');
    }

    console.log('--- Test Complete ---');
}

test().catch(console.error);
