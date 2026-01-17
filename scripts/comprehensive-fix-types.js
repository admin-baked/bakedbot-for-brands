#!/usr/bin/env node
/**
 * Comprehensive 'as any' Fix Script
 * 
 * Aggressively but safely reduces 'as any' usage in the codebase.
 * 
 * Usage:
 *   node scripts/comprehensive-fix-types.js [directory] --fix
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// PATTERNS
// =============================================================================

const FIX_PATTERNS = [
    // 1. Error Handling: catch (error: any) -> catch (error)
    // Typescript 4.4+ defaults catch variables to 'unknown' or 'any' based on config.
    // Removing explicit ': any' is cleaner and allows 'unknown' if useUnknownInCatchVariables is true.
    {
        name: 'Catch Clause any',
        pattern: /catch\s*\(\s*(\w+)\s*:\s*any\s*\)/g,
        replacement: 'catch ($1)'
    },
    
    // 2. Error Message: (error as any).message -> type guarded extraction
    // Finds: (e as any).message
    // Replaces with: (e instanceof Error ? e.message : String(e))
    {
        name: 'Error Message Extraction',
        pattern: /\(\s*(\w+)\s+as\s+any\s*\)\.message/g,
        replacement: '($1 instanceof Error ? $1.message : String($1))'
    },

    // 3. Process Env: process.env.VAR as any -> process.env.VAR
    // Usually these are strings anyway.
    {
        name: 'Process Env Cast',
        pattern: /process\.env\.(\w+)\s+as\s+any/g,
        replacement: 'process.env.$1'
    },

    // 4. Firestore Timestamp: (doc.data().createdAt as any)?.toDate()
    // Handled by previous script but good to double check or catch variations
    {
        name: 'Firestore Timestamp',
        pattern: /\(\s*(\w+(?:\.\w+)*)\s+as\s+any\s*\)(\??)\.toDate\(\)/g,
        replacement: 'toDate($1)'
    },

    // 5. JSON Parse: JSON.parse(...) as any -> JSON.parse(...)
    // JSON.parse returns 'any', so the cast is redundant.
    {
        name: 'JSON Parse',
        pattern: /JSON\.parse\((.*?)\)\s+as\s+any/g,
        replacement: 'JSON.parse($1)'
    },

    // 6. Generic "as any" cleanup in simplistic assignments
    // const x: Type = y as any; -> const x: Type = y; (Dangerous, use with caution)
    // We will stick to safer patterns for now.
];

const SKIP_PATTERNS = [
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /__tests__/,
    /node_modules/,
    /\.d\.ts$/,
];

// =============================================================================
// UTILS
// =============================================================================

function shouldSkipFile(filePath) {
    return SKIP_PATTERNS.some(pattern => pattern.test(filePath));
}

function findTsFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                findTsFiles(fullPath, files);
            }
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
            if (!shouldSkipFile(fullPath)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

// =============================================================================
// PROCESSOR
// =============================================================================

function processFile(filePath, isFixMode = false) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const importsNeeded = new Set();
    const findings = [];

    // 1. Apply Patterns
    for (const pattern of FIX_PATTERNS) {
        // Use loop to find all occurrences for reporting
        let match;
        const regex = new RegExp(pattern.pattern); // Ensure independent regex instance if needed
        while ((match = regex.exec(content)) !== null) {
            findings.push({
                type: pattern.name,
                match: match[0]
            });
        }
        
        if (isFixMode) {
            const matches = content.match(pattern.pattern);
            if (matches) {
                fixCount += matches.length;
                content = content.replace(pattern.pattern, pattern.replacement);
                if (pattern.name === 'Firestore Timestamp') {
                    importsNeeded.add("import { toDate } from '@/lib/utils';");
                }
            }
        }
    }

    // 2. Add Imports if needed
    if (isFixMode && importsNeeded.size > 0 && fixCount > 0) {
        const imports = Array.from(importsNeeded);
        for (const imp of imports) {
            const importName = imp.match(/import\s+\{\s*(\w+)/)[1];
            if (!content.includes(importName)) {
                // Add after imports
                const lastImport = content.lastIndexOf('import ');
                if (lastImport !== -1) {
                    const endOfLine = content.indexOf('\n', lastImport) + 1;
                    content = content.slice(0, endOfLine) + imp + '\n' + content.slice(endOfLine);
                } else {
                    content = imp + '\n' + content;
                }
            }
        }
    }

    // 3. Write changes
    if (isFixMode && content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    return {
        file: filePath,
        fixed: fixCount,
        findings: findings.length,
        details: findings
    };
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
    const args = process.argv.slice(2);
    const isFixMode = args.includes('--fix');
    const targetDir = args.find(a => !a.startsWith('--')) || 'src'; // Default to src

    console.log(`\n🧹 Comprehensive 'as any' Cleaner`);
    console.log(`${'='.repeat(40)}`);
    console.log(`Target: ${targetDir}`);
    console.log(`Mode: ${isFixMode ? 'FIX' : 'DRY RUN'}\n`);

    const fullPath = path.resolve(process.cwd(), targetDir);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Directory not found: ${fullPath}`);
        process.exit(1);
    }

    const files = findTsFiles(fullPath);
    console.log(`Found ${files.length} TypeScript files to scan\n`);

    let totalFixed = 0;
    let totalFindings = 0;

    for (const file of files) {
        const result = processFile(file, isFixMode);
        
        if (result.findings > 0) {
            totalFindings += result.findings;
            if (isFixMode) {
                totalFixed += result.fixed;
                console.log(`✅ Fixed ${result.fixed} issues in ${path.relative(process.cwd(), file)}`);
            } else {
                console.log(`🔎 Found ${result.findings} issues in ${path.relative(process.cwd(), file)}`);
            }
        }
    }

    console.log(`\n${'='.repeat(40)}`);
    console.log(`📊 Summary`);
    console.log(`   Matches Found: ${totalFindings}`);
    if (isFixMode) {
        console.log(`   Items Fixed:   ${totalFixed}`);
    } else {
        console.log(`   (Run with --fix to apply changes)`);
    }
}

main();
