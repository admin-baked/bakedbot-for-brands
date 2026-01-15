
import { scanCity } from '@/skills/domain/sales/city-scanner/index';

async function run() {
    console.log("🚀 Starting National Rollout Seed (Chicago & Detroit)...");
    
    // Chicago, IL
    // zips: ['60601', '60611', '60654', '60610']
    console.log("\n🏙️  Scanning Chicago, IL...");
    try {
        const chicagoRes = await scanCity({
            city: 'Chicago',
            state: 'IL',
            zip_codes: ['60601', '60611', '60654', '60610']
        });
        console.log("✅ Chicago Result:", chicagoRes);
    } catch (e) {
        console.error("❌ Failed Chicago:", e);
    }

    // Detroit, MI
    // zips: ['48201', '48226', '48207', '48202']
    console.log("\n🏙️  Scanning Detroit, MI...");
    try {
        const detroitRes = await scanCity({
            city: 'Detroit',
            state: 'MI',
            zip_codes: ['48201', '48226', '48207', '48202']
        });
        console.log("✅ Detroit Result:", detroitRes);
    } catch (e) {
        console.error("❌ Failed Detroit:", e);
    }

    console.log("\n✨ Rollout Seed Complete.");
}

run().catch(console.error);
