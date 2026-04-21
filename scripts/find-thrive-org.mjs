#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8'));
const app = initializeApp({ credential: cert(sa) });
const db = getFirestore(app);

async function main() {
  console.log('Finding all Thrive-related organizations...\n');
  try {
    const orgs = await db.collection('organizations').get();
    const thrive = orgs.docs.filter(d => d.id.includes('thrive') || d.data().name?.includes('Thrive'));
    
    if (thrive.length === 0) {
      console.log('❌ No Thrive orgs found.');
      console.log('\nAll organizations:');
      orgs.docs.slice(0, 10).forEach(doc => {
        const data = doc.data();
        console.log(`  ${doc.id}: ${data.name || 'no name'}`);
      });
    } else {
      console.log(`✅ Found ${thrive.length} Thrive organization(s):\n`);
      thrive.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  Created: ${data.createdAt?.toDate?.()?.toISOString?.() || 'unknown'}`);
        console.log();
      });
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
