import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envRaw = readFileSync(resolve(ROOT, '.env.local'), 'utf-8');
const env = {};
let currentKey = null, currentVal = '';
for (const line of envRaw.split('\n')) {
  const trimmed = line.trimEnd();
  if (trimmed.startsWith('#') || trimmed === '') { if (currentKey) { env[currentKey] = currentVal; currentKey = null; currentVal = ''; } continue; }
  const eq = trimmed.indexOf('=');
  if (eq > 0) { if (currentKey) env[currentKey] = currentVal; currentKey = trimmed.slice(0, eq).trim(); currentVal = trimmed.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1'); }
  else if (currentKey) currentVal += trimmed.trim();
}
if (currentKey) env[currentKey] = currentVal;

const sa = JSON.parse(Buffer.from(env['FIREBASE_SERVICE_ACCOUNT_KEY'], 'base64').toString());

const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');

if (getApps().length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const doc = await db.doc('brands/thrivesyracuse').get();
const data = doc.data();
console.log('logoUrl:', data.logoUrl);
console.log('useLogoInHeader:', data.useLogoInHeader);

if (!data.useLogoInHeader) {
  await db.doc('brands/thrivesyracuse').update({ useLogoInHeader: true });
  console.log('✅ Set useLogoInHeader = true');
} else {
  console.log('✅ useLogoInHeader already true');
}
