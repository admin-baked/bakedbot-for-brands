#!/usr/bin/env node

/**
 * Logging Migration Script
 * Automatically migrates console.log/error/warn to structured logger
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Files/directories to exclude
const EXCLUDE_PATTERNS = [
    'node_modules',
    '.next',
    'dist',
    'build',
    '.git',
    'scripts/migrate-logging.mjs', // Don't process this file
];

// Track stats
const stats = {
    filesProcessed: 0,
    filesModified: 0,
    replacements: {
        'console.log': 0,
        'console.error': 0,
        'console.warn': 0,
        'console.info': 0,
        'console.debug': 0,
    },
};

/**
 * Check if file should be processed
 */
function shouldProcessFile(filePath) {
    // Only process .ts and .tsx files
    if (!/\.(ts|tsx)$/.test(filePath)) return false;

    // Exclude patterns
    for (const pattern of EXCLUDE_PATTERNS) {
        if (filePath.includes(pattern)) return false;
    }

    return true;
}

/**
 * Recursively find all TypeScript files
 */
function findTypeScriptFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Skip excluded directories
            if (!EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
                findTypeScriptFiles(fullPath, files);
            }
        } else if (shouldProcessFile(fullPath)) {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Check if file already has logger import
 */
function hasLoggerImport(content) {
    return /import\s+{[^}]*logger[^}]*}\s+from\s+['"]@\/lib\/logger['"]/.test(content) ||
        /import\s+{\s*logger\s*}\s+from\s+['"]@\/lib\/logger['"]/.test(content);
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
    // Find the last import statement
    const importRegex = /^import\s+.+from\s+['"]\.*.*['"];?\s*$/gm;
    const imports = content.match(importRegex);

    if (imports && imports.length > 0) {
        // Add after the last import
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;

        return content.slice(0, insertPosition) +
            "\nimport { logger } from '@/lib/logger';" +
            content.slice(insertPosition);
    } else {
        // No imports, add at the beginning (after any comments)
        const lines = content.split('\n');
        let insertIndex = 0;

        // Skip initial comments
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '') {
                insertIndex = i + 1;
            } else {
                break;
            }
        }

        lines.splice(insertIndex, 0, "import { logger } from '@/lib/logger';", '');
        return lines.join('\n');
    }
}

/**
 * Migrate console calls to logger
 */
function migrateConsole(content) {
    let modified = false;
    let newContent = content;

    // Pattern: console.log(...) -> logger.info(...)
    const logPattern = /console\.log\s*\(/g;
    if (logPattern.test(content)) {
        newContent = newContent.replace(/console\.log\s*\(/g, 'logger.info(');
        stats.replacements['console.log'] += (content.match(/console\.log\s*\(/g) || []).length;
        modified = true;
    }

    // Pattern: console.error(...) -> logger.error(...)
    const errorPattern = /console\.error\s*\(/g;
    if (errorPattern.test(content)) {
        newContent = newContent.replace(/console\.error\s*\(/g, 'logger.error(');
        stats.replacements['console.error'] += (content.match(/console\.error\s*\(/g) || []).length;
        modified = true;
    }

    // Pattern: console.warn(...) -> logger.warn(...)
    const warnPattern = /console\.warn\s*\(/g;
    if (warnPattern.test(content)) {
        newContent = newContent.replace(/console\.warn\s*\(/g, 'logger.warn(');
        stats.replacements['console.warn'] += (content.match(/console\.warn\s*\(/g) || []).length;
        modified = true;
    }

    // Pattern: console.info(...) -> logger.info(...)
    const infoPattern = /console\.info\s*\(/g;
    if (infoPattern.test(content)) {
        newContent = newContent.replace(/console\.info\s*\(/g, 'logger.info(');
        stats.replacements['console.info'] += (content.match(/console\.info\s*\(/g) || []).length;
        modified = true;
    }

    // Pattern: console.debug(...) -> logger.debug(...)
    const debugPattern = /console\.debug\s*\(/g;
    if (debugPattern.test(content)) {
        newContent = newContent.replace(/console\.debug\s*\(/g, 'logger.debug(');
        stats.replacements['console.debug'] += (content.match(/console\.debug\s*\(/g) || []).length;
        modified = true;
    }

    return { content: newContent, modified };
}

/**
 * Process a single file
 */
function processFile(filePath) {
    stats.filesProcessed++;

    const content = fs.readFileSync(filePath, 'utf-8');
    const { content: migratedContent, modified } = migrateConsole(content);

    if (!modified) {
        return; // No console calls found
    }

    // Add logger import if needed
    let finalContent = migratedContent;
    if (!hasLoggerImport(migratedContent)) {
        finalContent = addLoggerImport(migratedContent);
    }

    // Write back to file
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    stats.filesModified++;

    const relativePath = path.relative(projectRoot, filePath);
    console.log(`✅ Migrated: ${relativePath}`);
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 Starting logging migration...\n');

    const srcDir = path.join(projectRoot, 'src');
    const files = findTypeScriptFiles(srcDir);

    console.log(`📁 Found ${files.length} TypeScript files to scan\n`);

    for (const file of files) {
        try {
            processFile(file);
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }

    console.log('\n✨ Migration complete!\n');
    console.log('📊 Statistics:');
    console.log(`  Files scanned: ${stats.filesProcessed}`);
    console.log(`  Files modified: ${stats.filesModified}`);
    console.log('  Replacements:');
    for (const [type, count] of Object.entries(stats.replacements)) {
        if (count > 0) {
            console.log(`    ${type}: ${count}`);
        }
    }

    const totalReplacements = Object.values(stats.replacements).reduce((a, b) => a + b, 0);
    console.log(`  Total: ${totalReplacements} replacements\n`);

    console.log('⚠️  Next steps:');
    console.log('  1. Run: npm run check:types');
    console.log('  2. Review changes: git diff');
    console.log('  3. Test the application');
    console.log('  4. Commit: git add -A && git commit -m "infra: Migrate to structured logging"');
}

main();
