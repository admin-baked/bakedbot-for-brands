
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminFirestore } from '../src/firebase/admin';

async function checkPages() {
    console.log('START_CHECK');
    try {
        const firestore = getAdminFirestore();
        const configRef = firestore.collection('foot_traffic').doc('config');

        const collections = ['zip_pages', 'dispensary_pages', 'brand_pages', 'seo_pages', 'city_pages', 'state_pages'];

        for (const colName of collections) {
            const snapshot = await configRef.collection(colName).count().get();
            console.log(`COLLECTION:${colName}:${snapshot.data().count}`);
        }
    } catch (error) {
        console.error('ERROR:', error);
    }
    console.log('END_CHECK');
}

checkPages();
