import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: 'studio-567050101-bc6e8' });
}
const db = getFirestore();

async function main() {
    // Check thrivesyracuse@bakedbot.ai user doc specifically
    const usersSnap = await db.collection('users')
        .where('orgId', '==', 'org_thrive_syracuse')
        .limit(10)
        .get();

    console.log(`Found ${usersSnap.size} users for org_thrive_syracuse:`);
    for (const doc of usersSnap.docs) {
        const u = doc.data();
        console.log(`  uid: ${doc.id}`);
        console.log(`  email: ${u.email || '(not set)'}`);
        console.log(`  role: ${u.role}`);
        console.log('');
    }
}

main().catch(err => { console.error(err.message); process.exit(1); });
