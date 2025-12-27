
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.OPENAI_VIDEO_API_KEY || process.env.OPENAI_API_KEY;

if (!API_KEY) {
    console.error('❌ CRITICAL: No OPENAI_VIDEO_API_KEY found in environment.');
    console.error('Usage: $env:OPENAI_VIDEO_API_KEY="sk-..." ; npx tsx dev/test-sora-endpoints.ts');
    process.exit(1);
}

const TESTS = [
    {
        name: 'Endpoint A: /v1/videos (Sora 2)',
        url: 'https://api.openai.com/v1/videos',
        body: {
            model: 'sora-2',
            prompt: 'a smiling cloud',
            seconds: 4,
            size: '1920x1080'
        }
    },
    {
        name: 'Endpoint B: /v1/video/generations (Sora 1 Turbo)',
        url: 'https://api.openai.com/v1/video/generations',
        body: {
            model: 'sora-1.0-turbo',
            prompt: 'a smiling cloud',
            size: '1920x1080',
            quality: 'standard'
        }
    },
    {
        name: 'Endpoint C: /v1/videos (Sora 2 Pro)',
        url: 'https://api.openai.com/v1/videos',
        body: {
            model: 'sora-2-pro',
            prompt: 'a smiling cloud',
            seconds: 4,
            size: '1920x1080'
        }
    }
];

async function runTests() {
    console.log(`🔑 Using API Key: ${API_KEY.substring(0, 8)}...`);

    for (const test of TESTS) {
        console.log(`\n----------------------------------------`);
        console.log(`🧪 Testing: ${test.name}`);
        console.log(`URL: ${test.url}`);
        console.log(`Payload:`, JSON.stringify(test.body));

        try {
            const response = await fetch(test.url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(test.body)
            });

            console.log(`Headers: x-request-id: ${response.headers.get('x-request-id')}`);
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            const text = await response.text();
            console.log(`Response: ${text.substring(0, 500)}`);

            if (response.ok) {
                console.log(`✅ SUCCESS! This is the correct configuration.`);
                return; // Stop after first success
            }
        } catch (err) {
            console.error(`❌ Network Error:`, err);
        }
    }

    console.log(`\n----------------------------------------`);
    console.log(`⚠️ All tests finished. If all failed, double check the API Key permissions.`);
}

runTests();
