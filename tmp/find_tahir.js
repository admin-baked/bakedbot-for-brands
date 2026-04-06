
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();

async function run() {
    console.log('🔍 Searching all bookings for "Tahir"...');
    try {
        const snap = await firestore.collection('meeting_bookings').get();
        let found = false;
        snap.forEach(doc => {
            const b = doc.data();
            const name = b.externalName || '';
            if (name.toLowerCase().includes('tahir')) {
                found = true;
                console.log(`\n--- FOUND BOOKING: ${doc.id} ---`);
                console.log(`Guest: ${b.externalName} (${b.externalEmail})`);
                console.log(`Profile Slug: ${b.profileSlug}`);
                console.log(`Start At: ${b.startAt?.toDate().toISOString()}`);
                console.log(`Calendar ID: ${b.calendarEventId || 'MISSING'}`);
                console.log(`Status: ${b.status}`);
            }
        });

        if (!found) {
            console.log('❌ No booking found containing "Tahir".');
        }
    } catch (err) {
        console.error('💥 Error:', err);
    }
}

run().then(() => process.exit(0));
