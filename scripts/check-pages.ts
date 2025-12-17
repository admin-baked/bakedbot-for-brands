
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminFirestore } from '../src/firebase/admin';

async function checkPages() {
    const db = getAdminFirestore();
    const config = db.collection('foot_traffic').doc('config');

    const zips = await config.collection('zip_pages').count().get();
    console.log(`ZIP_PAGES: ${zips.data().count}`);

    const dispensaries = await config.collection('dispensary_pages').count().get();
    console.log(`DISPENSARY_PAGES: ${dispensaries.data().count}`);
}

checkPages();
