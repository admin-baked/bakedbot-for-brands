
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testSoraConnection() {
    const apiKey = process.env.OPENAI_VIDEO_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('❌ NO API KEY FOUND in .env.local');
        return;
    }

    console.log('Testing Sora Connection...');
    console.log('Endpoint: https://api.openai.com/v1/videos');
    console.log('Model: sora-2');
    
    try {
        const response = await fetch('https://api.openai.com/v1/videos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sora-2',
                prompt: 'test connection',
                size: '1920x1080',
                seconds: 4
            })
        });

        console.log(`\nStatus Code: ${response.status} ${response.statusText}`);
        
        const text = await response.text();
        console.log('Response Body:', text.substring(0, 500)); // First 500 chars

    } catch (error) {
        console.error('Connection Failed:', error);
    }
}

testSoraConnection();
