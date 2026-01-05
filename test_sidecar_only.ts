
import { sidecar } from './src/server/services/python-sidecar';

async function testSidecar() {
    console.log('Testing Sidecar...');
    try {
        const result = await sidecar.execute('test', { valid: true });
        console.log('Result:', result);
    } catch (e) {
        console.error('Crash:', e);
    }
}

testSidecar();
