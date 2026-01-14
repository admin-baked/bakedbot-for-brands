
import { getAllTalkTracks } from '../src/server/repos/talkTrackRepo';

async function verifyTalkTracks() {
    console.log('Fetching Talk Tracks...');
    const allTracks = await getAllTalkTracks();
    console.log(`Found ${allTracks.length} tracks.`);

    const TEST_PROMPTS = [
        "I need to scrape menus for pricing",
        "How do I spy on competitors on LinkedIn?",
        "Start tracking 40 tons prices",
        "Setup a new integration",
        "This is a random question about weather"
    ];

    console.log('\n--- VERIFICATION MATRIX ---');

    for (const stimulus of TEST_PROMPTS) {
        console.log(`\n🔎 Testing Prompt: "${stimulus}"`);
        
        const relevantTracks = allTracks.filter(t => 
            (t.role === 'all' || t.role === 'dispensary') && // simulating dispensary agent
            t.isActive &&
            t.triggerKeywords.some(k => stimulus.toLowerCase().includes(k.toLowerCase()))
        );

        if (relevantTracks.length > 0) {
            console.log(`   ✅ MATCH: Found ${relevantTracks.length} tracks`);
            relevantTracks.forEach(t => console.log(`      - [${t.role}] ${t.name}`));
        } else {
            console.log(`   ❌ NO MATCH (Correct for generic queries)`);
        }
    }
}

verifyTalkTracks().catch(console.error);
