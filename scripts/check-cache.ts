
import { createServerClient } from '../src/firebase/server-client';

async function run() {
    console.log('Checking Firestore cache for 90002...');
    const { firestore } = await createServerClient();
    const doc = await firestore.collection('zip_code_cache').doc('90002').get();

    if (doc.exists) {
        console.log('Cache Entry:', JSON.stringify(doc.data(), null, 2));
    } else {
        console.log('No cache entry found for 90002');
    }
}

run().catch(console.error);
