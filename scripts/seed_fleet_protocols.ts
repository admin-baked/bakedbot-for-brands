
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';
import { createPlaybook } from '@/server/tools/playbook-manager';
import { getAdminFirestore } from '@/firebase/admin';

async function seedFleetProtocols() {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'; // Default to emulator if running locally without SA
    // OR allow it to fail if no creds, user needs to run in right env.
    
    console.log('🌱 Seeding "Always On" Fleet Protocols...');

    const agents = ['linus', 'leo', 'jack', 'glenda'];
    
    for (const playbookDef of DEFAULT_PLAYBOOKS) {
        if (playbookDef.status === 'active' && agents.includes(playbookDef.agent)) {
            console.log(`Checking ${playbookDef.name} (${playbookDef.agent})...`);
            
            // In a real script we might check existence first, but createPlaybook 
            // creates a new one. We'll just create it for now to ensure it exists.
            // Ideally we'd deduplicate.
            
            try {
                 const id = await createPlaybook({
                    name: playbookDef.name,
                    description: playbookDef.description,
                    agent: playbookDef.agent,
                    steps: playbookDef.steps,
                    schedule: playbookDef.schedule // This triggers schedule creation
                }, 'system_seed');
                
                console.log(`✅ Deployed ${playbookDef.name} -> ID: ${id}`);
            } catch (e) {
                console.error(`❌ Failed to deploy ${playbookDef.name}:`, e);
            }
        }
    }
    
    console.log('DONE. Verification: check Firestore "schedules" collection.');
}

seedFleetProtocols().catch(console.error);
