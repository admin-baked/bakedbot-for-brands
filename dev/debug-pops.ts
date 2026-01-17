
// dev/debug-pops.ts
const main = async () => {
    try {
        console.log('Attemping to import pops...');
        const pops = await import('../src/server/agents/pops');
        console.log('Import success:', pops);
    } catch (e) {
        console.error('Import failed:', e);
    }
};
main();
