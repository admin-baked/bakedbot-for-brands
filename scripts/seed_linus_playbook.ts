
import { createPlaybook } from '@/server/tools/playbook-manager';

async function seed() {
    console.log("Seeding Linus Playbook...");

    const result = await createPlaybook({
        name: "Protocol: Zero Bug Tolerance",
        description: "Proactive bug hunting and codebase health verification by Linus (CTO).",
        agentId: "linus",
        schedule: "0 * * * *", // Every hour
        active: true,
        steps: [
            {
                action: "git_log",
                params: { count: 5 },
                label: "Check Recent Commits"
            },
            {
                action: "run_health_check",
                params: { scope: "build_only" },
                label: "Verify Build Integrity"
            },
            {
                action: "search_codebase",
                params: { pattern: "FIXME|TODO: HIGH PRIORITY" },
                label: "Scan for Critical Debt"
            },
            {
                action: "context_log_decision",
                params: { 
                    decision: "Completed Routine Sweep",
                    reasoning: "Outcome of hourly pulse check.",
                    category: "operations"
                }
            }
        ]
    });

    console.log("Result:", result);
}

seed().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
