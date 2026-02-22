#!/usr/bin/env node
/**
 * SP1: Firestore Index Reporting
 * Quick reference for indexes in firestore.indexes.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const indexPath = path.join(ROOT, 'firestore.indexes.json');

try {
  console.log('\n🔍 Firestore Indexes Report\n');

  const content = fs.readFileSync(indexPath, 'utf-8');
  const data = JSON.parse(content);
  const indexes = data.indexes || [];

  console.log(`📊 Total indexes: ${indexes.length}\n`);

  // Group by collection
  const byCollection = {};

  for (const idx of indexes) {
    const collection = idx.collectionGroup;
    if (!byCollection[collection]) {
      byCollection[collection] = [];
    }

    const fields = idx.fields
      .map(f => `${f.fieldPath} (${f.order || 'ASC'})`)
      .join(', ');

    byCollection[collection].push(fields);
  }

  // Print by collection
  const collections = Object.keys(byCollection).sort();
  for (const collection of collections) {
    const indexList = byCollection[collection];
    console.log(`📦 ${collection}: ${indexList.length} index(es)`);
    indexList.forEach((fields, i) => {
      console.log(`   ${i + 1}. ${fields}`);
    });
    console.log();
  }

  console.log('✅ Report complete\n');

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
