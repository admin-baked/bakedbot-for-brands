#!/usr/bin/env node
/**
 * Cannabis Science Knowledge Base — Ingestion Pipeline
 *
 * Downloads the HuggingFace dataset, curates relevant Q&A pairs,
 * generates Gemini embeddings, and uploads to Supabase pgvector.
 *
 * Usage:
 *   node tmp/ingest-cannabis-science.mjs                  # full run
 *   node tmp/ingest-cannabis-science.mjs --pilot           # 5-item pilot
 *   node tmp/ingest-cannabis-science.mjs --dry-run         # preview only
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const HF_DATASET = 'KellanF89/Cannabis_Science_Data';
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMS = 768;
const BATCH_SIZE = 20;
const EMBED_RPM = 400; // stay under 490 RPM limit
const CACHE_DIR = 'tmp/cannabis-science-cache';

const isDryRun = process.argv.includes('--dry-run');
const isPilot = process.argv.includes('--pilot');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// --- Category classification ---
const CATEGORY_KEYWORDS = {
  terpenes: ['terpene', 'myrcene', 'limonene', 'pinene', 'linalool', 'caryophyllene', 'terpinolene', 'humulene', 'ocimene', 'bisabolol'],
  effects: ['effect', 'psychoactive', 'euphoria', 'sedation', 'relaxation', 'anxiety', 'pain', 'sleep', 'appetite', 'nausea', 'entourage'],
  cannabinoids: ['thc', 'cbd', 'cbg', 'cbn', 'cbda', 'thca', 'cannabinoid', 'cannabinol', 'cannabigerol', 'endocannabinoid'],
  extraction: ['extract', 'distillate', 'rosin', 'resin', 'concentrate', 'solvent', 'co2', 'butane', 'ethanol', 'supercritical'],
  pharmacology: ['pharmacol', 'receptor', 'cb1', 'cb2', 'bioavail', 'metabolism', 'dose', 'dosage', 'half-life', 'pharmacokinetic'],
  cultivation: ['cultivar', 'strain', 'grow', 'harvest', 'flowering', 'vegetative', 'indica', 'sativa', 'hybrid', 'phenotype', 'genotype'],
  consumption: ['edible', 'vape', 'smoke', 'topical', 'tincture', 'sublingual', 'inhalation', 'oral', 'transdermal'],
  safety: ['safety', 'contaminant', 'pesticide', 'heavy metal', 'microbial', 'testing', 'potency', 'lab test', 'certificate'],
};

function classifyCategory(question, answer) {
  const text = `${question} ${answer}`.toLowerCase();
  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return bestCategory;
}

// Consumer-relevance filter — skip highly technical research-only content
const SKIP_PATTERNS = [
  /chromatograph/i,
  /mass spectromet/i,
  /HPLC/,
  /GC-MS/,
  /regression analysis/i,
  /statistical significance/i,
  /p-value/i,
  /standard deviation/i,
  /coefficient of determination/i,
  /methodology section/i,
];

function isConsumerRelevant(question, answer) {
  const text = `${question} ${answer}`;
  // Skip pure lab methodology
  if (SKIP_PATTERNS.some(p => p.test(text))) return false;
  // Keep if it matches any category well
  const cat = classifyCategory(question, answer);
  return cat !== 'general' || text.length > 100;
}

// --- HuggingFace dataset download ---
async function downloadDataset() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

  const indexFile = path.join(CACHE_DIR, 'file_list.json');

  // Fetch the file list from HuggingFace API (recurse into subdirectories)
  console.log('📥 Fetching dataset file list from HuggingFace...');
  const jsonFiles = [];
  const rootUrl = `https://huggingface.co/api/datasets/${HF_DATASET}/tree/main`;
  const rootResp = await fetch(rootUrl);
  if (!rootResp.ok) throw new Error(`HF API error: ${rootResp.status} ${rootResp.statusText}`);
  const rootFiles = await rootResp.json();

  // Check for subdirectories containing JSON files
  const dirs = rootFiles.filter(f => f.type === 'directory');
  for (const dir of dirs) {
    const dirResp = await fetch(`${rootUrl}/${dir.path}`);
    if (!dirResp.ok) continue;
    const dirFiles = await dirResp.json();
    jsonFiles.push(...dirFiles.filter(f => f.path.endsWith('.json')));
  }
  // Also check root-level JSON files
  jsonFiles.push(...rootFiles.filter(f => f.path.endsWith('.json') && f.type === 'file'));
  console.log(`   Found ${jsonFiles.length} batch files`);
  writeFileSync(indexFile, JSON.stringify(jsonFiles, null, 2));

  // Download each batch file
  const allQA = [];
  const maxFiles = isPilot ? 1 : jsonFiles.length;

  for (let i = 0; i < maxFiles; i++) {
    const file = jsonFiles[i];
    const cachePath = path.join(CACHE_DIR, file.path.replace(/\//g, '_'));

    if (existsSync(cachePath)) {
      console.log(`   ♻️  Cached: ${file.path}`);
      const data = JSON.parse(readFileSync(cachePath, 'utf-8'));
      allQA.push(...extractQAPairs(data, file.path));
      continue;
    }

    console.log(`   ⬇️  Downloading ${file.path} (${i + 1}/${maxFiles})...`);
    const dlUrl = `https://huggingface.co/datasets/${HF_DATASET}/resolve/main/${file.path}`;
    const dlResp = await fetch(dlUrl);
    if (!dlResp.ok) {
      console.warn(`   ⚠️  Failed to download ${file.path}: ${dlResp.status}`);
      continue;
    }
    const data = await dlResp.json();
    writeFileSync(cachePath, JSON.stringify(data));
    allQA.push(...extractQAPairs(data, file.path));

    // Rate limit
    if (i < maxFiles - 1) await sleep(200);
  }

  return allQA;
}

function extractQAPairs(data, fileName) {
  const pairs = [];
  // Dataset structure: { paper_name: { chunk_N: { generated: [{question, answer}], context, source_pdf } } }
  for (const [paperName, chunks] of Object.entries(data)) {
    if (typeof chunks !== 'object' || chunks === null) continue;
    for (const [chunkKey, chunkData] of Object.entries(chunks)) {
      if (!chunkData || !chunkData.generated) continue;
      for (const qa of chunkData.generated) {
        if (!qa.question || !qa.answer) continue;
        pairs.push({
          question: qa.question.trim(),
          answer: qa.answer.trim(),
          context: (chunkData.context || '').trim().slice(0, 2000),
          source_pdf: chunkData.source_pdf || paperName || fileName,
        });
      }
    }
  }
  return pairs;
}

// --- Gemini embedding ---
async function embedBatch(texts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${GEMINI_KEY}`;
  const requests = texts.map(text => ({
    model: `models/${EMBED_MODEL}`,
    content: { parts: [{ text: text.slice(0, 2048) }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: EMBED_DIMS,
  }));

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini embed error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  return data.embeddings.map(e => e.values);
}

async function embedQuery(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: text.slice(0, 2048) }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: EMBED_DIMS,
    }),
  });

  if (!resp.ok) throw new Error(`Gemini embed error ${resp.status}`);
  const data = await resp.json();
  return data.embedding.values;
}

// --- Upload to Supabase ---
async function uploadBatch(rows) {
  const { error } = await supabase.from('cannabis_science_qa').insert(rows);
  if (error) throw new Error(`Supabase insert error: ${error.message}`);
}

// --- Main ---
async function main() {
  console.log('🌿 Cannabis Science Knowledge Base — Ingestion Pipeline');
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : isPilot ? 'PILOT (5 items)' : 'FULL RUN'}`);
  console.log('');

  // Step 1: Validate API keys
  console.log('🔑 Validating API keys...');
  const { error: sbErr } = await supabase.from('cannabis_science_qa').select('id').limit(1);
  if (sbErr && !sbErr.message.includes('does not exist')) {
    console.error(`❌ Supabase connection failed: ${sbErr.message}`);
    console.error('   → Run scripts/supabase-setup.sql in the Supabase SQL Editor first');
    process.exit(1);
  }
  if (sbErr?.message.includes('does not exist')) {
    console.error('❌ Table cannabis_science_qa does not exist.');
    console.error('   → Run scripts/supabase-setup.sql in the Supabase SQL Editor first');
    process.exit(1);
  }
  console.log('   ✅ Supabase connected');

  // Test Gemini embedding
  const testEmbed = await embedQuery('test');
  if (testEmbed.length !== EMBED_DIMS) {
    console.error(`❌ Unexpected embedding dimension: ${testEmbed.length} (expected ${EMBED_DIMS})`);
    process.exit(1);
  }
  console.log('   ✅ Gemini embeddings working');

  // Step 2: Download dataset
  console.log('');
  console.log('📚 Downloading dataset...');
  const rawQA = await downloadDataset();
  console.log(`   Total raw Q&A pairs: ${rawQA.length.toLocaleString()}`);

  // Step 3: Curate — filter to consumer-relevant content
  const curated = rawQA.filter(qa => isConsumerRelevant(qa.question, qa.answer));
  console.log(`   After curation filter: ${curated.length.toLocaleString()} pairs`);

  // Classify categories
  for (const qa of curated) {
    qa.category = classifyCategory(qa.question, qa.answer);
  }

  // Category breakdown
  const catCounts = {};
  for (const qa of curated) {
    catCounts[qa.category] = (catCounts[qa.category] || 0) + 1;
  }
  console.log('   Category breakdown:');
  for (const [cat, count] of Object.entries(catCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${cat}: ${count.toLocaleString()}`);
  }

  if (isDryRun) {
    console.log('\n🏁 Dry run complete. No data uploaded.');
    console.log('   Sample entries:');
    for (const qa of curated.slice(0, 3)) {
      console.log(`   Q: ${qa.question.slice(0, 100)}`);
      console.log(`   A: ${qa.answer.slice(0, 100)}`);
      console.log(`   Category: ${qa.category} | Source: ${qa.source_pdf}`);
      console.log('');
    }
    return;
  }

  // Step 4: Pilot (5 items)
  const items = isPilot ? curated.slice(0, 5) : curated;
  console.log(`\n📤 Uploading ${items.length.toLocaleString()} items...`);

  // Process in batches
  let uploaded = 0;
  const batches = chunk(items, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    // Generate embeddings for this batch
    const texts = batch.map(qa => `${qa.question}\n${qa.answer}`);
    let embeddings;
    try {
      embeddings = await embedBatch(texts);
    } catch (err) {
      console.error(`   ⚠️  Embedding batch ${i + 1} failed: ${err.message}`);
      // Retry once after 5s
      await sleep(5000);
      try {
        embeddings = await embedBatch(texts);
      } catch (retryErr) {
        console.error(`   ❌ Retry failed, skipping batch ${i + 1}`);
        continue;
      }
    }

    // Build rows
    const rows = batch.map((qa, j) => ({
      question: qa.question,
      answer: qa.answer,
      context: qa.context || null,
      source_pdf: qa.source_pdf || null,
      category: qa.category,
      embedding: JSON.stringify(embeddings[j]),
    }));

    // Upload
    try {
      await uploadBatch(rows);
      uploaded += batch.length;
      if ((i + 1) % 10 === 0 || i === batches.length - 1) {
        console.log(`   ✅ ${uploaded.toLocaleString()} / ${items.length.toLocaleString()} uploaded`);
      }
    } catch (err) {
      console.error(`   ❌ Upload batch ${i + 1} failed: ${err.message}`);
    }

    // Rate limit: ~400 RPM for embeddings = ~150ms per batch of 20
    if (i < batches.length - 1) await sleep(150);
  }

  console.log(`\n🏁 Done! ${uploaded.toLocaleString()} Q&A pairs uploaded to Supabase.`);

  // Verify
  const { count } = await supabase.from('cannabis_science_qa').select('id', { count: 'exact', head: true });
  console.log(`   Total rows in table: ${count?.toLocaleString()}`);
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
