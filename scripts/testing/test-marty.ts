/**
 * Marty Pressure Test Harness
 *
 * Usage: npx tsx tmp/test-marty.ts "Your question here"
 */

// Bypass server-only guard for local testing
require('module').constructor._cache = require('module').constructor._cache || {};
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request: string, ...args: unknown[]) {
    if (request === 'server-only') return require.resolve('./mock-server-only');
    return origResolve.call(this, request, ...args);
};

import 'dotenv/config';

async function main() {
    const { runMarty } = await import('@/server/agents/marty');

    const question = process.argv[2];
    if (!question) {
        console.error('Usage: npx tsx tmp/test-marty.ts "Your question here"');
        process.exit(1);
    }

    console.log(`\nQUESTION: ${question}\n`);
    console.log('Waiting for Marty...\n');

    const start = Date.now();

    try {
        const response = await runMarty({
            prompt: question,
            maxIterations: 4,
            context: { userId: 'pressure-test', orgId: 'org_bakedbot_internal' },
            progressCallback: (msg: string) => {
                console.log(`  ${msg}`);
            },
        });

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        console.log(`\nMARTY RESPONSE (${elapsed}s, model: ${response.model}):`);
        console.log('-'.repeat(60));
        console.log(response.content);
        console.log('-'.repeat(60));

        if (response.toolExecutions && response.toolExecutions.length > 0) {
            console.log(`\nTOOLS USED (${response.toolExecutions.length}):`);
            for (const tool of response.toolExecutions) {
                console.log(`  - ${tool.name}: ${JSON.stringify(tool.result).slice(0, 150)}`);
            }
        } else {
            console.log('\nNO TOOLS USED');
        }
    } catch (err) {
        console.error(`\nERROR: ${err instanceof Error ? err.message : String(err)}`);
    }

    process.exit(0);
}

main();
