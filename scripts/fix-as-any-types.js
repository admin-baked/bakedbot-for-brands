#!/usr/bin/env node
/**
 * Fix 'as any' Type Assertions Script
 * 
 * This script helps identify and suggests fixes for common 'as any' patterns.
 * It's semi-automated - it identifies patterns and suggests replacements but
 * requires manual review for complex cases.
 * 
 * Usage:
 *   node scripts/fix-as-any-types.js [directory]
 *   
 * Example:
 *   node scripts/fix-as-any-types.js src/server/actions
 *   
 * Modes:
 *   --report      Generate a report of all 'as any' usages (default)
 *   --fix-safe    Auto-fix safe patterns (timestamps, simple casts)
 */

const fs = require('fs');
const path = require('path');

// Safe patterns that can be auto-fixed
const SAFE_PATTERNS = [
    {
        name: 'Firestore Timestamp to Date',
        // Match: (data.createdAt as any)?.toDate() or (data.createdAt as any).toDate()
        pattern: /\((\w+(?:\.\w+)*)\s+as\s+any\)(\?)?\.toDate\(\)/g,
        replacement: 'toDate($1)',
        import: "import { toDate } from '@/lib/utils';",
    },
    {
        name: 'Date as any for Firestore',
        // Match: new Date() as any
        pattern: /new Date\(\)\s+as\s+any/g,
        replacement: 'new Date()',
        import: null,
    },
    {
        name: 'Error message extraction',
        // Match: (error as any).message
        pattern: /\((\w+)\s+as\s+any\)\.message/g,
        replacement: '$1 instanceof Error ? $1.message : String($1)',
        import: null,
    },
];

// Patterns that need manual review
const REVIEW_PATTERNS = [
    {
        name: 'Object property access',
        pattern: /\((\w+)\s+as\s+any\)\.\w+/g,
        suggestion: 'Define proper interface or use type guard',
    },
    {
        name: 'Function parameter cast',
        pattern: /\w+\s+as\s+any(?=\s*[,\)])/g,
        suggestion: 'Use proper type annotation or generic',
    },
    {
        name: 'Array element cast',
        pattern: /\[\d+\]\s+as\s+any/g,
        suggestion: 'Type the array properly',
    },
];

// Skip patterns
const SKIP_PATTERNS = [
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /__tests__/,
    /node_modules/,
];

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

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const findings = [];
    
    // Count total 'as any' occurrences
    const asAnyMatches = content.match(/as\s+any/g);
    const totalAsAny = asAnyMatches ? asAnyMatches.length : 0;
    
    if (totalAsAny === 0) return null;
    
    // Find line numbers for each occurrence
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const matches = line.match(/as\s+any/g);
        
        if (matches) {
            matches.forEach(() => {
                // Determine category
                let category = 'unknown';
                let suggestion = 'Manual review required';
                
                // Check safe patterns
                for (const pattern of SAFE_PATTERNS) {
                    if (pattern.pattern.test(line)) {
                        category = 'safe-fix';
                        suggestion = pattern.name;
                        break;
                    }
                    // Reset lastIndex since we're reusing regex
                    pattern.pattern.lastIndex = 0;
                }
                
                // Check review patterns
                if (category === 'unknown') {
                    for (const pattern of REVIEW_PATTERNS) {
                        if (pattern.pattern.test(line)) {
                            category = 'needs-review';
                            suggestion = pattern.suggestion;
                            break;
                        }
                        pattern.pattern.lastIndex = 0;
                    }
                }
                
                findings.push({
                    line: lineNum,
                    content: line.trim().slice(0, 100),
                    category,
                    suggestion,
                });
            });
        }
    });
    
    return {
        file: filePath,
        totalAsAny,
        findings,
    };
}

function fixSafePatterns(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const importsNeeded = new Set();
    
    for (const pattern of SAFE_PATTERNS) {
        const matches = content.match(pattern.pattern);
        if (matches) {
            content = content.replace(pattern.pattern, pattern.replacement);
            fixCount += matches.length;
            if (pattern.import) {
                importsNeeded.add(pattern.import);
            }
        }
        // Reset lastIndex
        pattern.pattern.lastIndex = 0;
    }
    
    // Add imports if needed
    if (importsNeeded.size > 0) {
        const imports = Array.from(importsNeeded);
        for (const imp of imports) {
            if (!content.includes(imp.split(' from ')[1].replace(/[';]/g, ''))) {
                // Add after existing imports
                const importMatch = content.match(/^(import.*?;\s*)+/m);
                if (importMatch) {
                    const lastImportEnd = importMatch.index + importMatch[0].length;
                    content = content.slice(0, lastImportEnd) + 
                              imp + '\n' + 
                              content.slice(lastImportEnd);
                }
            }
        }
    }
    
    if (fixCount > 0) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    return fixCount;
}

function main() {
    const args = process.argv.slice(2);
    const fixSafe = args.includes('--fix-safe');
    const targetDir = args.find(a => !a.startsWith('--')) || 'src';
    
    console.log(`\n🔍 'as any' Type Analysis Script`);
    console.log(`${'='.repeat(40)}`);
    console.log(`Target: ${targetDir}`);
    console.log(`Mode: ${fixSafe ? 'FIX SAFE PATTERNS' : 'REPORT ONLY'}\n`);
    
    const fullPath = path.resolve(process.cwd(), targetDir);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Directory not found: ${fullPath}`);
        process.exit(1);
    }
    
    const files = findTsFiles(fullPath);
    console.log(`Found ${files.length} TypeScript files to scan\n`);
    
    let totalAsAny = 0;
    let safeFixable = 0;
    let needsReview = 0;
    let filesWithIssues = 0;
    let totalFixed = 0;
    
    const report = [];
    
    for (const file of files) {
        const analysis = analyzeFile(file);
        
        if (analysis) {
            filesWithIssues++;
            totalAsAny += analysis.totalAsAny;
            
            const safeFixes = analysis.findings.filter(f => f.category === 'safe-fix').length;
            const reviewNeeded = analysis.findings.filter(f => f.category === 'needs-review').length;
            
            safeFixable += safeFixes;
            needsReview += reviewNeeded;
            
            if (fixSafe && safeFixes > 0) {
                const fixed = fixSafePatterns(file);
                totalFixed += fixed;
                console.log(`✅ Fixed ${fixed} patterns in ${path.relative(process.cwd(), file)}`);
            }
            
            report.push(analysis);
        }
    }
    
    // Print summary
    console.log(`\n${'='.repeat(40)}`);
    console.log(`📊 Summary:`);
    console.log(`   Files scanned: ${files.length}`);
    console.log(`   Files with 'as any': ${filesWithIssues}`);
    console.log(`   Total 'as any' occurrences: ${totalAsAny}`);
    console.log(`   Safe to auto-fix: ${safeFixable}`);
    console.log(`   Needs manual review: ${needsReview}`);
    console.log(`   Unknown/complex: ${totalAsAny - safeFixable - needsReview}`);
    
    if (fixSafe) {
        console.log(`\n   🔧 Auto-fixed: ${totalFixed}`);
    }
    
    // Print top files with issues
    if (!fixSafe && report.length > 0) {
        console.log(`\n📁 Top files with 'as any' (by count):`);
        report
            .sort((a, b) => b.totalAsAny - a.totalAsAny)
            .slice(0, 10)
            .forEach((r, i) => {
                console.log(`   ${i + 1}. ${path.relative(process.cwd(), r.file)}: ${r.totalAsAny}`);
            });
        
        console.log(`\n💡 Run with --fix-safe to auto-fix safe patterns`);
    }
}

main();
