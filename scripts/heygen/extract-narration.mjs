#!/usr/bin/env node

/**
 * Extract narration text from onboarding video scripts.
 *
 * Strips [ACTION] markers, markdown formatting, and section headers
 * to produce clean narration text suitable for HeyGen API input.
 *
 * Usage:
 *   node scripts/heygen/extract-narration.mjs [script-path]
 *   node scripts/heygen/extract-narration.mjs --all
 *   node scripts/heygen/extract-narration.mjs --all --json
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const SCRIPTS_DIR = join(process.cwd(), 'dev', 'onboarding-video-scripts');

/**
 * Extract narration from a single script markdown file.
 * Keeps only quoted dialogue and description lines.
 * Strips [ACTION], ##, ---, B-ROLL, and metadata lines.
 */
function extractNarration(markdownContent) {
  const lines = markdownContent.split('\n');
  const narrationLines = [];

  let inBRoll = false;
  let inProductionNotes = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Skip B-ROLL and production notes sections (check BEFORE stripping headers)
    if (/^##?\s*(B-ROLL|PRODUCTION)/i.test(trimmed)) {
      inBRoll = true;
      continue;
    }
    if (inBRoll || inProductionNotes) {
      if (/^##?\s*(HOOK|WALK|CLOSE|ACT|INTRO)/i.test(trimmed)) {
        inBRoll = false;
        inProductionNotes = false;
      } else {
        continue;
      }
    }

    // Skip frontmatter and metadata
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('---')) continue;
    if (trimmed.startsWith('>')) continue;
    if (trimmed.startsWith('|')) continue;
    if (trimmed.startsWith('```')) continue;

    // Skip [ACTION] lines
    if (trimmed.startsWith('[ACTION]')) continue;

    // Skip metadata lines
    if (/^(Duration|OPEN ON|AUDIENCE|USE CASE):/i.test(trimmed)) continue;

    // Skip section timing markers like (0:00 - 0:05)
    if (/^\(\d+:\d+\s*-\s*\d+:\d+\)$/.test(trimmed)) continue;

    // Skip step labels like "### Step 1: ..."
    if (/^###?\s*(Step \d|Act \d)/i.test(trimmed)) continue;

    // Clean up the line
    let clean = trimmed;

    // Remove surrounding quotes
    clean = clean.replace(/^[""]|[""]$/g, '');

    // Remove markdown bold/italic
    clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
    clean = clean.replace(/\*([^*]+)\*/g, '$1');

    // Remove markdown links
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Skip if the cleaned line is too short (likely a label)
    if (clean.length < 10) continue;

    // Skip lines that are just labels/headers in disguise
    if (/^(For |Quick |Pro tip)/i.test(clean) && clean.length < 30) continue;

    narrationLines.push(clean);
  }

  return narrationLines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract title from script markdown.
 */
function extractTitle(markdownContent) {
  const match = markdownContent.match(/^#\s+(?:Video \d+:\s*)?(.+)/m);
  return match ? match[1].trim() : 'Untitled';
}

/**
 * Get all script files (01-10, skip 00 guide and 11 bonus).
 */
function getScriptFiles() {
  const files = readdirSync(SCRIPTS_DIR)
    .filter(f => /^\d{2}-.+\.md$/.test(f))
    .filter(f => !f.startsWith('00-') && !f.startsWith('11-'))
    .sort();
  return files;
}

// --- CLI ---

const args = process.argv.slice(2);
const isAll = args.includes('--all');
const isJson = args.includes('--json');
const isIncludeBonus = args.includes('--include-bonus');

if (isAll) {
  let files = getScriptFiles();
  if (isIncludeBonus) {
    const bonus = readdirSync(SCRIPTS_DIR).find(f => f.startsWith('11-'));
    if (bonus) files.push(bonus);
  }

  const results = files.map(file => {
    const content = readFileSync(join(SCRIPTS_DIR, file), 'utf-8');
    return {
      file,
      stepId: file.replace(/^\d+-/, '').replace(/\.md$/, ''),
      title: extractTitle(content),
      narration: extractNarration(content),
      charCount: extractNarration(content).length,
    };
  });

  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${r.file} — ${r.title} (${r.charCount} chars)`);
      console.log('='.repeat(60));
      console.log(r.narration);
    }
    console.log(`\n--- Total: ${results.length} scripts, ${results.reduce((s, r) => s + r.charCount, 0)} chars ---`);
  }
} else {
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    console.error('Usage: node scripts/heygen/extract-narration.mjs [script.md]');
    console.error('       node scripts/heygen/extract-narration.mjs --all [--json]');
    process.exit(1);
  }
  const content = readFileSync(filePath, 'utf-8');
  const narration = extractNarration(content);
  if (isJson) {
    console.log(JSON.stringify({ title: extractTitle(content), narration, charCount: narration.length }));
  } else {
    console.log(narration);
  }
}
