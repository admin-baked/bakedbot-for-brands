
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "studio-567050101-bc6e8"
    });
}

const firestore = admin.firestore();

async function run() {
    console.log('🔍 Searching ALL bookings for email: "ceo@simplypuretrenton.com"...');
    try {
        const snap = await firestore.collection('meeting_bookings')
            .where('externalEmail', '==', 'ceo@simplypuretrenton.com')
            .get();

        if (snap.empty) {
            console.log('❌ No booking found for that email.');
            // Let's broaden search to all "Tahir"
            const nameSnap = await firestore.collection('meeting_bookings').get();
            let found = false;
            nameSnap.forEach(doc => {
                const b = doc.data();
                if ((b.externalName || '').toLowerCase().includes('tahir')) {
                    found = true;
                    console.log(`\n--- FOUND BOOKING by Name: ${doc.id} ---`);
                    console.log(`Guest: ${b.externalName} (${b.externalEmail})`);
                    console.log(`Profile: ${b.profileSlug}`);
                    console.log(`Start: ${b.startAt?.toDate()?.toISOString()}`);
                    console.log(`Calendar ID: ${b.calendarEventId || 'MISSING'}`);
                }
            });
            if (!found) console.log('❌ No booking found containing "Tahir" in name either.');
        } else {
            snap.forEach(doc => {
                const b = doc.data();
                console.log(`\n--- FOUND BOOKING: ${doc.id} ---`);
                console.log(`Guest: ${b.externalName} (${b.externalEmail})`);
                console.log(`Profile Slug: ${b.profileSlug}`);
                console.log(`Start At: ${b.startAt?.toDate().toISOString()}`);
                console.log(`Calendar ID: ${b.calendarEventId || 'MISSING'}`);
                console.log(`Status: ${b.status}`);
            });
        }
    } catch (err) {
        console.error('💥 Error:', err);
    }
}

run().then(() => process.exit(0));
