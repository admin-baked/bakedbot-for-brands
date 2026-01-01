
import { loadSkill } from '../src/skills/loader';
import { Skill } from '../src/skills/types';

function logSkill(skill: Skill) {
    console.log('---------------------------------------------------');
    console.log(`Loaded Skill: ${skill.id}`);
    console.log(`Version: ${skill.version}`);
    console.log(`Name: ${skill.name}`);
    console.log('---------------------------------------------------');
    console.log('Instructions Preview:');
    console.log(skill.instructions.substring(0, 100) + '...');
    console.log('---------------------------------------------------');
    console.log('Tools Found:', skill.tools.length);
    skill.tools.forEach(t => {
        console.log(` - ${t.definition.name}: ${t.definition.description}`);
        console.log(`   [Has Implementation]: ${!!t.implementation}`);
    });
    console.log('---------------------------------------------------');
}

async function main() {
    try {
        console.log('Testing SkillLoader...');
        // Load Core Search
        const searchSkill = await loadSkill('core/search');
        logSkill(searchSkill);

        // Load Domain CannMenus
        const cannMenusSkill = await loadSkill('domain/cannmenus');
        logSkill(cannMenusSkill);

        // Load Core Email
        // const emailSkill = await loadSkill('core/email');
        // logSkill(emailSkill);

        // Load Core Browser
        const browserSkill = await loadSkill('core/browser');
        logSkill(browserSkill);

        // Load Domain Dutchie
        const dutchieSkill = await loadSkill('domain/dutchie');
        logSkill(dutchieSkill);

        // Load Domain LeafLink
        const leafLinkSkill = await loadSkill('domain/leaflink');
        logSkill(leafLinkSkill);

        // Load Core Productivity
        const productivitySkill = await loadSkill('core/productivity');
        logSkill(productivitySkill);

        // Load Core Terminal
        const terminalSkill = await loadSkill('core/terminal');
        logSkill(terminalSkill);

        // Load Core Analysis
        const analysisSkill = await loadSkill('core/analysis');
        logSkill(analysisSkill);
    } catch (error: any) {
        console.error('SkillLoader Test Failed!');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
