
import fetch from 'node-fetch';

async function testInterrupt() {
    const url = 'http://localhost:3000/api/webhooks/error-report';
    const secret = process.env.CRON_SECRET || 'bb_cron_9x8v7u6t5s4r3q2p'; // Use the secret we know

    console.log(`Sending Interrupt to ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secret}`
            },
            body: JSON.stringify({
                error: 'ReferenceError: process is not defined',
                stack: `ReferenceError: process is not defined
    at verifySuperAdmin (src/server/utils/auth-check.ts:15:23)
    at GET (src/app/api/tickets/route.ts:9:20)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)`,
                context: {
                    user: 'test_user_123',
                    route: '/api/tickets'
                }
            })
        });

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (e) {
        console.error('Failed to send interrupt:', e);
    }
}

testInterrupt();
