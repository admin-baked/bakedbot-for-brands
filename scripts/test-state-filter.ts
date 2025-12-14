
import { CANNMENUS_CONFIG } from '@/lib/config';
import fs from 'fs';

const BASE = CANNMENUS_CONFIG.API_BASE;
const KEY = CANNMENUS_CONFIG.API_KEY;

async function testStateParams() {
    let log = 'Starting State Filter Test\n';

    const variations = [
        { param: 'state', value: 'IL' },
        { param: 'state', value: 'Illinois' },
        { param: 'states', value: 'IL' },
        { param: 'states', value: 'Illinois' },
        { param: 'address', value: 'Chicago, IL' } // Shot in the dark
    ];

    for (const v of variations) {
        log += `\n--- Testing: ${v.param}=${v.value} ---\n`;
        const params: any = { limit: 5 };
        params[v.param] = v.value;
        const q = new URLSearchParams(params).toString();
        const url = `${BASE}/v1/retailers?${q}`;

        try {
            const res = await fetch(url, { headers: { 'X-Token': KEY } });
            const data = await res.json();
            const retailers = data.data || [];

            log += `Found: ${retailers.length}\n`;
            if (retailers.length > 0) {
                const r = retailers[0];
                log += `First: ${r.name} (${r.city}, ${r.state})\n`;
            }
        } catch (e) {
            log += `Error: ${e.message}\n`;
        }
    }

    fs.writeFileSync('state_output.txt', log);
    console.log('Done.');
}

testStateParams().catch(console.error);
