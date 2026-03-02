#!/usr/bin/env npx tsx
/**
 * Workflow CLI — Command-line interface for BakedBot workflows
 *
 * Commands:
 *   list                         List all registered workflows
 *   run <id> [--dry-run] [--orgId=X]  Execute a workflow
 *   validate <id>                Validate a workflow definition
 *
 * Usage:
 *   npx tsx scripts/workflow-cli.ts list
 *   npx tsx scripts/workflow-cli.ts run morning-briefing --dry-run
 *   npx tsx scripts/workflow-cli.ts validate content-engine
 */

import * as path from 'path';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Load .env.local (same pattern as pinky.mjs)
// ---------------------------------------------------------------------------

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split(/\r?\n/)) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help') {
        console.log(`
BakedBot Workflow CLI
=====================

Commands:
  list                              List all registered workflows
  run <id> [--dry-run] [--orgId=X]  Execute a workflow
  validate <id>                     Validate a workflow definition

Examples:
  npx tsx scripts/workflow-cli.ts list
  npx tsx scripts/workflow-cli.ts run morning-briefing --dry-run
  npx tsx scripts/workflow-cli.ts validate content-engine
`);
        process.exit(0);
    }

    // Import and bootstrap the registry
    await import('../src/server/services/workflow-definitions/index');
    const { listWorkflows, getWorkflow, validateWorkflow } = await import(
        '../src/server/services/workflow-registry'
    );

    switch (command) {
        case 'list': {
            const workflows = listWorkflows();
            if (workflows.length === 0) {
                console.log('No workflows registered.');
                break;
            }

            console.log(`\n  Registered Workflows (${workflows.length})\n`);
            console.log('  ' + '-'.repeat(76));
            console.log(
                '  ' +
                    'ID'.padEnd(24) +
                    'Name'.padEnd(30) +
                    'Agent'.padEnd(10) +
                    'Category'
            );
            console.log('  ' + '-'.repeat(76));

            for (const w of workflows) {
                const trigger =
                    'schedule' in w.trigger
                        ? (w.trigger as { schedule: string }).schedule
                        : (w.trigger as { type: string }).type;
                console.log(
                    '  ' +
                        w.id.padEnd(24) +
                        w.name.substring(0, 28).padEnd(30) +
                        (w.agent ?? '-').padEnd(10) +
                        (w.category ?? '-')
                );
                console.log('  ' + '  └─ trigger: ' + trigger);
            }
            console.log();
            break;
        }

        case 'run': {
            const workflowId = args[1];
            if (!workflowId) {
                console.error('Usage: run <workflow-id> [--dry-run] [--orgId=X]');
                process.exit(1);
            }

            const dryRun = args.includes('--dry-run');
            const orgArg = args.find(a => a.startsWith('--orgId='));
            const orgId = orgArg?.replace('--orgId=', '');

            const def = getWorkflow(workflowId);
            if (!def) {
                console.error(`Workflow not found: ${workflowId}`);
                console.error('Run "list" to see available workflows.');
                process.exit(1);
            }

            console.log(`\n  Running workflow: ${def.name} (${def.id})`);
            console.log(`  Mode: ${dryRun ? 'DRY RUN (no side effects)' : 'LIVE'}`);
            if (orgId) console.log(`  Org: ${orgId}`);
            console.log();

            const { executeWorkflowDefinition } = await import(
                '../src/server/services/workflow-runtime'
            );

            const startTime = Date.now();
            const result = await executeWorkflowDefinition(def, {
                triggeredBy: 'cli',
                orgId,
                dryRun,
            });

            const elapsed = Date.now() - startTime;

            console.log(`\n  WORKFLOW EXECUTION REPORT`);
            console.log('  ' + '='.repeat(50));
            console.log(`  Workflow:   ${def.name}`);
            console.log(`  Status:     ${result.status.toUpperCase()}`);
            console.log(`  Duration:   ${elapsed}ms`);
            console.log(`  Execution:  ${result.id}`);
            if (result.error) console.log(`  Error:      ${result.error}`);
            console.log();

            if (result.stepResults.length > 0) {
                console.log('  Steps:');
                for (const step of result.stepResults) {
                    const icon =
                        step.status === 'completed'
                            ? '  ✓'
                            : step.status === 'skipped'
                              ? '  ○'
                              : step.status === 'failed'
                                ? '  ✗'
                                : step.status === 'timed_out'
                                  ? '  ⏱'
                                  : '  ?';
                    const label = step.label ?? step.action;
                    const duration = step.durationMs ? ` (${step.durationMs}ms)` : '';
                    console.log(`  ${icon} ${label}${duration}`);

                    if (step.forEachSummary) {
                        console.log(
                            `      └─ forEach: ${step.forEachSummary.processedItems}/${step.forEachSummary.totalItems} processed, ${step.forEachSummary.failedItems} failed`
                        );
                    }
                    if (step.parallelResults) {
                        const ok = step.parallelResults.filter(r => r.status === 'completed').length;
                        const fail = step.parallelResults.filter(r => r.status === 'failed').length;
                        console.log(`      └─ parallel: ${ok} completed, ${fail} failed`);
                    }
                    if (step.complianceResult && !step.complianceResult.passed) {
                        console.log(`      └─ compliance: BLOCKED (${step.complianceResult.violations?.join(', ')})`);
                    }
                    if (step.error) {
                        console.log(`      └─ error: ${step.error}`);
                    }
                }
            }

            console.log();
            process.exit(result.status === 'completed' ? 0 : 1);
            break;
        }

        case 'validate': {
            const workflowId = args[1];
            if (!workflowId) {
                console.error('Usage: validate <workflow-id>');
                process.exit(1);
            }

            const def = getWorkflow(workflowId);
            if (!def) {
                console.error(`Workflow not found: ${workflowId}`);
                process.exit(1);
            }

            const result = validateWorkflow(def);

            console.log(`\n  Validation: ${def.name} (${def.id})`);
            console.log('  ' + '-'.repeat(50));

            if (result.valid) {
                console.log('  Status: VALID ✓');
            } else {
                console.log('  Status: INVALID ✗');
            }

            if (result.errors.length > 0) {
                console.log('\n  Errors:');
                for (const err of result.errors) {
                    console.log(`    ✗ ${err}`);
                }
            }

            if (result.warnings.length > 0) {
                console.log('\n  Warnings:');
                for (const warn of result.warnings) {
                    console.log(`    ⚠ ${warn}`);
                }
            }

            console.log();
            process.exit(result.valid ? 0 : 1);
            break;
        }

        default:
            console.error(`Unknown command: ${command}`);
            console.error('Run without arguments for help.');
            process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
