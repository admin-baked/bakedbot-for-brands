
import { getAllTalkTracks } from '../src/server/repos/talkTrackRepo';

async function verifyTalkTracks() {
    console.log('Fetching Talk Tracks...');
    const allTracks = await getAllTalkTracks();
    console.log(`Found ${allTracks.length} tracks.`);

    const stimulus = "I need to scrape menus";
    console.log(`\nSimulating Stimulus: "${stimulus}"`);

    const relevantTracks = allTracks.filter(t => 
        (t.role === 'all' || t.role === 'dispensary') &&
        t.isActive &&
        t.triggerKeywords.some(k => stimulus.toLowerCase().includes(k.toLowerCase()))
    );

    console.log(`Relevant Tracks Found: ${relevantTracks.length}`);
    
    if (relevantTracks.length > 0) {
        let context = `\n\n[RECOMMENDED TALK TRACKS]\nUse these examples to guide your response style and structure:\n`;
        relevantTracks.forEach(t => {
            context += `\n--- SCENARIO: ${t.name} ---\n`;
            t.steps.forEach(s => {
                context += `Step ${s.order}: ${s.message}\n`;
            });
        });
        console.log('--- INJECTED CONTEXT ---');
        console.log(context);
        console.log('------------------------');
    } else {
        console.log('No relevant tracks found. (Unexpected if "scrape menus" is a trigger)');
    }
}

verifyTalkTracks().catch(console.error);
