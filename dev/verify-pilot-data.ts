
import { createServerClient } from '@/firebase/server-client';

async function main() {
    console.log('--- Verifying Pilot Generation Data ---');
    const { firestore } = await createServerClient();

    // Check Dispensary Pages
    const dispSnapshot = await firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').count().get();
    console.log(`Dispensary Pages: ${dispSnapshot.data().count}`);

    // Check ZIP Pages
    const zipSnapshot = await firestore.collection('foot_traffic').doc('config').collection('zip_pages').count().get();
    console.log(`ZIP Pages: ${zipSnapshot.data().count}`);

    // Check City Pages
    const citySnapshot = await firestore.collection('foot_traffic').doc('config').collection('city_pages').get();
    console.log(`City Pages: ${citySnapshot.size}`);
    citySnapshot.docs.forEach(d => console.log(` - ${d.id} (${d.data().name}, ${d.data().state})`));

    // Check State Pages
    const stateSnapshot = await firestore.collection('foot_traffic').doc('config').collection('state_pages').get();
    console.log(`State Pages: ${stateSnapshot.size}`);
    stateSnapshot.docs.forEach(d => console.log(` - ${d.id}`));

    process.exit(0);
}

main().catch(console.error);
