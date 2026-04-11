/**
 * Dead service scanner — finds service files with zero imports across the codebase.
 * Focuses on flat files in src/server/services (not subdirs, which are index-based).
 */
import fs from 'fs';
import path from 'path';

const servicesDir = path.join(process.cwd(), 'src/server/services');
const searchDirs = [
    path.join(process.cwd(), 'src/server/agents'),
    path.join(process.cwd(), 'src/server/services'),
    path.join(process.cwd(), 'src/server/actions'),
    path.join(process.cwd(), 'src/app'),
    path.join(process.cwd(), 'src/components'),
    path.join(process.cwd(), 'src/server/tools'),
];

function getAllTs(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) getAllTs(full, acc);
        else if (entry.name.match(/\.(ts|tsx)$/) && !entry.name.includes('.test.')) acc.push(full);
    }
    return acc;
}

const allSourceFiles = searchDirs.flatMap(d => getAllTs(d));

// Only check flat .ts files in services root (not subdirs)
const serviceFiles = fs.readdirSync(servicesDir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts'))
    .map(e => e.name);

const results = { dead: [], lowUsage: [] };

for (const fileName of serviceFiles) {
    const baseName = fileName.replace('.ts', '');
    let importCount = 0;
    const importedBy = [];

    for (const srcFile of allSourceFiles) {
        // Skip the file itself
        if (srcFile.endsWith(`/services/${fileName}`) || srcFile.endsWith(`\\services\\${fileName}`)) continue;
        const content = fs.readFileSync(srcFile, 'utf8');
        const patterns = [
            `/${baseName}'`,
            `/${baseName}"`,
            `from '@/server/services/${baseName}'`,
            `require('@/server/services/${baseName}')`,
        ];
        if (patterns.some(p => content.includes(p))) {
            importCount++;
            importedBy.push(path.basename(srcFile));
        }
    }

    if (importCount === 0) {
        results.dead.push(fileName);
    } else if (importCount === 1) {
        results.lowUsage.push({ file: fileName, importedBy });
    }
}

console.log('\n=== DEAD (0 imports) ===');
results.dead.forEach(f => console.log(' -', f));

console.log('\n=== LOW USAGE (1 import) ===');
results.lowUsage.forEach(({ file, importedBy }) => console.log(` - ${file}  ← ${importedBy[0]}`));

console.log(`\nTotal dead: ${results.dead.length}, Low usage: ${results.lowUsage.length}`);

// Write to JSON for clean parsing
fs.writeFileSync(path.join(process.cwd(), 'tmp/dead_services.json'), JSON.stringify(results, null, 2), 'utf8');
