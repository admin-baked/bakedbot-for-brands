
import { getAdminFirestore } from '../src/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

async function debugTahir() {
    console.log('🔍 Searching for Tahir...');
    const firestore = getAdminFirestore();
    
    // Search for bookings with Tahir in the name
    const snap = await firestore.collection('meeting_bookings')
        .where('externalName', '>=', 'Tahir')
        .where('externalName', '<=', 'Tahir\uf8ff')
        .get();

    if (snap.empty) {
        console.log('❌ No bookings found with name "Tahir".');
        // Let's broaden search to all recent bookings
        const allSnap = await firestore.collection('meeting_bookings')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        console.log('📋 Last 10 Bookings:');
        allSnap.forEach(d => {
            const b = d.data();
            console.log(`- ${d.id}: ${b.externalName} (${b.profileSlug}) at ${b.startAt.toDate().toISOString()}`);
        });
        return;
    }

    console.log(`✅ Found ${snap.size} bookings for Tahir:`);
    for (const doc of snap.docs) {
        const b = doc.data();
        console.log(`\n--- Booking: ${doc.id} ---`);
        console.log(`Profile: ${b.profileSlug}`);
        console.log(`Email: ${b.externalEmail}`);
        console.log(`Start: ${b.startAt.toDate().toISOString()}`);
        console.log(`Status: ${b.status}`);
        console.log(`Video Link: ${b.videoRoomUrl}`);
        console.log(`GCal Event ID: ${b.calendarEventId || 'EMPTY'}`);
        
        if (b.profileSlug) {
            const pDoc = await firestore.collection('executive_profiles').doc(b.profileSlug).get();
            const p = pDoc.data();
            console.log(`Profile Name: ${p?.displayName}`);
            console.log(`Profile GCal: ${p?.googleCalendarTokens?.refresh_token ? 'CONNECTED' : 'MISSING'}`);
        }
    }
}

debugTahir().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
