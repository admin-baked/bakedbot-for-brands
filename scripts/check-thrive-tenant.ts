import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: 'studio-567050101-bc6e8' });
}
const db = getFirestore();

async function main() {
    // Check tenant doc
    const tenantDoc = await db.collection('tenants').doc('org_thrive_syracuse').get();
    if (!tenantDoc.exists) {
        console.log('Tenant doc NOT FOUND in tenants collection');
        // Also check brands collection
        const brandDoc = await db.collection('brands').doc('org_thrive_syracuse').get();
        if (brandDoc.exists) {
            const data = brandDoc.data()!;
            console.log('Found in brands collection:');
            console.log('  ownerId:', data.ownerId);
            console.log('  createdBy:', data.createdBy);
            console.log('  email:', data.email);
        }
    } else {
        const data = tenantDoc.data()!;
        console.log('Tenant doc found. Key fields:');
        console.log('  ownerId:', data.ownerId);
        console.log('  createdBy:', data.createdBy);
        console.log('  email:', data.email);
        console.log('  name:', data.name);
    }

    // Check who has org_thrive_syracuse in their claims
    console.log('\nLooking for users with orgId=org_thrive_syracuse...');
    const usersSnap = await db.collection('users')
        .where('orgId', '==', 'org_thrive_syracuse')
        .limit(5)
        .get();

    if (usersSnap.empty) {
        console.log('No users found with orgId=org_thrive_syracuse');
    } else {
        for (const doc of usersSnap.docs) {
            const u = doc.data();
            console.log(`  User: ${u.email} (uid: ${doc.id}, role: ${u.role})`);
        }
    }
}

main().catch(err => { console.error(err.message); process.exit(1); });
