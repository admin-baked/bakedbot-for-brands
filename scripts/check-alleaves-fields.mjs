/**
 * Check what fields Alleaves returns for Thrive inventory
 * Specifically looking at: category, strain, thc, cbd
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');

const get = (key) => {
    const m = env.match(new RegExp(`${key}=([^\\n]+)`));
    return m ? m[1].trim() : '';
};

const USERNAME = get('ALLEAVES_USERNAME');
const PASSWORD = get('ALLEAVES_PASSWORD');
const PIN = get('ALLEAVES_PIN');
const LOCATION_ID = get('ALLEAVES_LOCATION_ID');
const API_BASE = 'https://app.alleaves.com/api';

console.log('Credentials:', { USERNAME, LOCATION_ID, hasPW: !!PASSWORD, hasPIN: !!PIN });

// Authenticate
const authResp = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD, pin: PIN }),
});

if (!authResp.ok) {
    console.error('Auth failed:', authResp.status, (await authResp.text()).slice(0, 200));
    process.exit(1);
}

const authData = await authResp.json();
const token = authData.token || authData.access_token;
console.log('Auth OK\n');

// Fetch inventory
const invResp = await fetch(`${API_BASE}/inventory/search`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: '' }),
});

if (!invResp.ok) {
    console.error('Inventory failed:', invResp.status, (await invResp.text()).slice(0, 500));
    process.exit(1);
}

const items = await invResp.json();
const list = Array.isArray(items) ? items : items.data || items.items || [];
console.log(`Fetched ${list.length} inventory items\n`);

// Analyze category and strain fields
const categories = new Set();
let withThc = 0, noThc = 0;

console.log('Sample items (first 25):');
for (const item of list.slice(0, 25)) {
    const thc = item.thc ?? item.thc_percentage;
    const cat = item.category || '';
    const strain = item.strain || '';
    categories.add(cat);
    if (thc && thc > 0) withThc++; else noThc++;
    console.log(`  ${(item.item || '').slice(0, 38).padEnd(38)} | cat: ${cat.slice(0, 35).padEnd(35)} | strain: ${strain.slice(0, 20).padEnd(20)} | THC: ${thc ?? '?'}`);
}

console.log('\nAll unique categories:');
for (const cat of [...categories].sort()) console.log(`  "${cat}"`);

console.log(`\nProducts with THC > 0: ${withThc}`);
console.log(`Products with no THC: ${noThc}`);
console.log('\nFirst item full keys:', Object.keys(list[0] || {}).join(', '));
