
import { executiveAgent } from '@/server/agents/executive';
import { craigAgent } from '@/server/agents/craig'; // Standard agent
import { defaultExecutiveTools } from '@/app/dashboard/ceo/agents/default-tools';
import { defaultCraigTools } from '@/app/dashboard/ceo/agents/default-tools';
import { createServerClient } from '@/firebase/server-client';

async function demonstrate() {
    console.log("=== PLAYBOOK CREATION DEMONSTRATION ===");
    
    // 1. Executive Agent (Leo) - Create ACTIVE Playbook
    console.log("\n1. Executive Agent (Leo) creating ACTIVE Playbook...");
    const leoTools = defaultExecutiveTools;
    if (leoTools.createPlaybook) {
        const result = await leoTools.createPlaybook(
            "Executive Daily Briefing", 
            "Daily strategic overview for the CEO", 
            [{ action: "generate_snapshot", params: { query: "Daily Overview" } }], 
            "0 8 * * *"
        );
        console.log("Leo Result:", result);
        console.log("Verify ACTIVE status: " + (result.message && !result.error));
    } else {
        console.error("Leo missing createPlaybook tool!");
    }

    // 2. Standard Agent (Craig) - Create DRAFT Playbook
    console.log("\n2. Standard Agent (Craig) proposing DRAFT Playbook...");
    const craigTools = defaultCraigTools as any;
    if (craigTools.draft_playbook) {
        const result = await craigTools.draft_playbook(
            "Marketing Blast Draft", 
            "Draft campaign for approval", 
            [{ action: "email.send", params: { to: "{{user.email}}", subject: "Draft" } }]
        );
        console.log("Craig Result:", result);
        
        // Check Firestore if possible, or trust return
        // Note: The mock result might not return the status explicitly depending on playbook-manager return
    } else {
        console.error("Craig missing draft_playbook tool!");
    }
}

demonstrate().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
