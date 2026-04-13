#!/usr/bin/env node
/**
 * Secret Scanner Guardrail
 * 
 * Scans the current git diff for potential hardcoded secrets before they are pushed.
 * Patterns: AIzaSy (Google), sk- (OpenAI), ghp_ (GitHub), etc.
 */

import { execSync } from 'child_process';

const FORBIDDEN_PATTERNS = [
  /AIzaSy[A-Za-z0-9\-_]{30,45}/,    // Google API Key
  /sk-[A-Za-z0-9]{48}/,          // OpenAI Key (legacy)
  /sk-proj-[A-Za-z0-9\-]{48}/,   // OpenAI Project Key
  /ghp_[A-Za-z0-9]{36}/,         // GitHub Token
  /xoxp-[A-Za-z0-9\-]{30,}/,     // Slack User Token
  /xoxb-[A-Za-z0-9\-]{30,}/,     // Slack Bot Token
];

function checkSecrets() {
  console.log('[check-secrets] Scanning staged and local changes for hardcoded secrets...');

  try {
    // Get all changes (staged + current)
    const staged = execSync('git diff --cached', { encoding: 'utf8' });
    const unstaged = execSync('git diff', { encoding: 'utf8' });
    const diff = staged + '\n' + unstaged;
    
    if (!diff) {
      console.log('[check-secrets] No changes found to scan.');
      return;
    }

    const lines = diff.split('\n');
    let violations = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Only check added lines
        if (!line.startsWith('+') || line.startsWith('+++')) continue;

        for (const pattern of FORBIDDEN_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
                console.error(`\x1b[31m[CRITICAL SECURITY ALERT]\x1b[0m Potential secret detected:`);
                console.error(`  Pattern: ${pattern}`);
                console.error(`  Line ${i}: ${line.trim()}`);
                violations++;
            }
        }
    }

    if (violations > 0) {
      console.error(`\n\x1b[31m[FAILED]\x1b[0m ${violations} potential secret(s) detected. Fix these before pushing.`);
      process.exit(1);
    }

    console.log('[check-secrets] ✅ No hardcoded secrets detected in diff.');
  } catch (error) {
    if (error.message.includes('not a git repository')) {
        console.warn('[check-secrets] Not a git repository, skipping scan.');
        return;
    }
    console.error(`[check-secrets] Scan failed: ${error.message}`);
    process.exit(1);
  }
}

checkSecrets();
