
// scripts/test-require.ts
const path = require('path');
// Mocking aliases roughly? No, tsx handles tsconfig paths usually.

async function run() {
    try {
        console.log("Attempting import...");
        const mod = await import('../src/app/dashboard/ceo/agents/default-tools');
        console.log("Success:", Object.keys(mod));
    } catch (e) {
        console.error("IMPORT ERROR:", e);
    }
}
run();
