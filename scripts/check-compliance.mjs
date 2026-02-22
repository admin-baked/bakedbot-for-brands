#!/usr/bin/env node
/**
 * SP8: Compliance Pre-Publish Hook CLI
 *
 * Manual compliance checker for content validation
 * Uses Claude Haiku to check for medical claims, minors protection violations, etc.
 *
 * Usage:
 *   node scripts/check-compliance.mjs --text "content here"
 *   node scripts/check-compliance.mjs --file path/to/file.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ============================================================================
// UTILITIES
// ============================================================================

function loadApiKey() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  let apiKey = null;

  content.split('\n').forEach(line => {
    if (line.startsWith('CLAUDE_API_KEY=')) {
      apiKey = line.split('=')[1];
    }
  });

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not found in .env.local');
  }

  return apiKey;
}

async function callClaude(apiKey, content) {
  const url = 'https://api.anthropic.com/v1/messages';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `You are a cannabis compliance validator. Check the provided content for violations:
1. Medical Claims: Any health benefits, curing diseases, treating conditions (BLOCK)
2. Minors Protection: Age verification language, "kids safe", etc. (BLOCK)
3. Age-Gating: Failure to prompt age check or disclaimer (WARN)
4. Over-Marketing: Excessive superlatives or claims (INFO)

Respond with JSON: { "compliant": boolean, "violations": string[] }`,
      messages: [
        {
          role: 'user',
          content: `Check this content for compliance:\n\n${content}`
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🔍 Compliance Checker\n');

  try {
    let content = null;

    // Get content from args
    const textArg = process.argv.find(arg => arg.startsWith('--text='));
    const fileArg = process.argv.find(arg => arg.startsWith('--file='));

    if (textArg) {
      content = textArg.substring('--text='.length);
    } else if (fileArg) {
      const filePath = fileArg.substring('--file='.length);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}\n`);
        process.exit(1);
      }
      content = fs.readFileSync(filePath, 'utf-8');
    } else {
      console.log(`Usage:
  node scripts/check-compliance.mjs --text "content here"
  node scripts/check-compliance.mjs --file path/to/file.txt

Examples:
  node scripts/check-compliance.mjs --text "Buy our premium cannabis products!"
  node scripts/check-compliance.mjs --file campaign.txt\n`);
      process.exit(1);
    }

    if (!content || content.trim().length === 0) {
      console.log('❌ Content is empty\n');
      process.exit(1);
    }

    console.log(`📝 Checking ${content.length} characters of content...\n`);

    // Call Claude API
    const apiKey = loadApiKey();
    const response = await callClaude(apiKey, content);

    // Parse response
    let compliant = false;
    let violations = [];

    try {
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        compliant = result.compliant !== false;
        violations = result.violations || [];
      }
    } catch {
      console.log('⚠️  Could not parse compliance response\n');
      console.log(response);
      process.exit(1);
    }

    // Report
    if (compliant) {
      console.log('✅ APPROVED\n');
      console.log('Content passed compliance checks.\n');
    } else {
      console.log('❌ BLOCKED\n');
      console.log('Compliance violations detected:\n');
      violations.forEach((violation, i) => {
        console.log(`   ${i + 1}. ${violation}`);
      });
      console.log();
    }

    process.exit(compliant ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('   Make sure CLAUDE_API_KEY is set in .env.local\n');
    process.exit(1);
  }
}

main();
