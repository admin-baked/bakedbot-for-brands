
import https from 'https';

async function checkTime() {
    console.log('--- System Time Check ---');
    const systemTime = new Date();
    console.log('System Time (Local):', systemTime.toString());
    console.log('System Time (ISO):  ', systemTime.toISOString());
    console.log('System Time (ms):   ', systemTime.getTime());

    console.log('\n--- Internet Time Check (worldtimeapi.org) ---');
    
    // Fetch time from Google (very reliable)
    const req = https.get('https://www.google.com', { method: 'HEAD' }, (res) => {
        try {
            const dateHeader = res.headers.date;
            if (!dateHeader) {
                console.error('No Date header received from Google');
                return;
            }
            
            const networkTime = new Date(dateHeader);
            console.log('Network Time (Header):', networkTime.toString());
            console.log('Network Time (ISO):   ', networkTime.toISOString());
            console.log('Network Time (ms):    ', networkTime.getTime());
            
            const diff = Math.abs(systemTime.getTime() - networkTime.getTime());
            const diffMinutes = Math.floor(diff / 1000 / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);

            console.log('\n--- Result ---');
            console.log(`Difference: ${diff} ms`);
            console.log(`Difference: approx ${diffDays} days, ${diffHours % 24} hours`);

            if (diffDays > 0 || Math.abs(diffMinutes) > 5) {
                console.error('\n❌ CRITICAL: Significant clock skew detected!');
                console.error('This will cause "invalid_grant" errors with Google Auth.');
                console.error('Tokens issued with future dates are rejected immediately.');
            } else {
                console.log('\n✅ Clock sync looks good.');
            }

        } catch (e) {
            console.error('Failed to parse network time:', e);
        }
    });

    req.on('error', (e) => {
        console.error('Network request failed:', e);
    });
}

checkTime();
