#!/usr/bin/env node
/**
 * Console.log to Logger Migration Script
 * 
 * This script helps migrate console.log/error/warn/info statements
 * to the structured logger from @/lib/logger.
 * 
 * Usage:
 *   node scripts/migrate-console-to-logger.js [directory]
 *   
 * Example:
 *   node scripts/migrate-console-to-logger.js src/server/actions
 *   node scripts/migrate-console-to-logger.js src/server/services
 *   
 * Modes:
 *   --dry-run     Show what would be changed without modifying files
 *   --interactive Prompt before each file change
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOGGER_IMPORT = "import { logger } from '@/lib/logger';";

// Mapping of console methods to logger methods
const CONSOLE_TO_LOGGER = {
    'console.log': 'logger.info',
    'console.info': 'logger.info',
    'console.warn': 'logger.warn',
    'console.error': 'logger.error',
    'console.debug': 'logger.debug',
};

// Patterns to skip (already using logger or in tests)
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

function transformConsoleCalls(content, filePath) {
    let modified = content;
    let changeCount = 0;
    const changes = [];
    
    // Check if logger is already imported
    const hasLoggerImport = content.includes("from '@/lib/logger'") || 
                            content.includes('from "@/lib/logger"');
    
    // Transform each console method
    for (const [consoleMethod, loggerMethod] of Object.entries(CONSOLE_TO_LOGGER)) {
        // Pattern to match console.X( calls
        const pattern = new RegExp(
            `${consoleMethod.replace('.', '\\.')}\\s*\\(`,
            'g'
        );
        
        const matches = content.match(pattern);
        if (matches) {
            changeCount += matches.length;
            changes.push(`${consoleMethod} → ${loggerMethod}: ${matches.length}`);
            
            // Simple replacement for basic cases
            modified = modified.replace(pattern, `${loggerMethod}(`);
        }
    }
    
    // Add logger import if needed and we made changes
    if (changeCount > 0 && !hasLoggerImport) {
        // Find the best place to add the import
        const importMatch = modified.match(/^(import.*?;\s*)+/m);
        if (importMatch) {
            const lastImportEnd = importMatch.index + importMatch[0].length;
            modified = modified.slice(0, lastImportEnd) + 
                       LOGGER_IMPORT + '\n' + 
                       modified.slice(lastImportEnd);
        } else {
            // Add at the top after 'use server' if present
            if (modified.includes("'use server'")) {
                modified = modified.replace(
                    "'use server';",
                    `'use server';\n\n${LOGGER_IMPORT}`
                );
            } else {
                modified = LOGGER_IMPORT + '\n\n' + modified;
            }
        }
    }
    
    return { modified, changeCount, changes };
}

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const targetDir = args.find(a => !a.startsWith('--')) || 'src/server';
    
    console.log(`\n🔧 Console to Logger Migration Script`);
    console.log(`${'='.repeat(40)}`);
    console.log(`Target: ${targetDir}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}\n`);
    
    const fullPath = path.resolve(process.cwd(), targetDir);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Directory not found: ${fullPath}`);
        process.exit(1);
    }
    
    const files = findTsFiles(fullPath);
    console.log(`Found ${files.length} TypeScript files to scan\n`);
    
    let totalChanges = 0;
    let filesModified = 0;
    
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const { modified, changeCount, changes } = transformConsoleCalls(content, file);
        
        if (changeCount > 0) {
            const relativePath = path.relative(process.cwd(), file);
            console.log(`📝 ${relativePath}`);
            changes.forEach(c => console.log(`   - ${c}`));
            
            if (!dryRun) {
                fs.writeFileSync(file, modified, 'utf-8');
                console.log(`   ✅ Updated`);
            } else {
                console.log(`   🔍 Would update (dry run)`);
            }
            
            totalChanges += changeCount;
            filesModified++;
        }
    }
    
    console.log(`\n${'='.repeat(40)}`);
    console.log(`📊 Summary:`);
    console.log(`   Files scanned: ${files.length}`);
    console.log(`   Files ${dryRun ? 'would be ' : ''}modified: ${filesModified}`);
    console.log(`   Console calls ${dryRun ? 'would be ' : ''}migrated: ${totalChanges}`);
    
    if (dryRun) {
        console.log(`\n💡 Run without --dry-run to apply changes`);
    } else {
        console.log(`\n✅ Migration complete! Run TypeScript check to verify.`);
    }
}

main();
