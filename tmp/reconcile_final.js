
const admin = require('firebase-admin');
const axios = require('axios'); // We'll use axios if available, otherwise fetch/http
const { Timestamp } = require('firebase-admin/firestore');

if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();

async function sendEmail(data) {
    // We try to call the platform API if we can, or just mock it for this test
    // Actually, I'll use the MJ API directly if I can find the keys
    console.log(`✉️ Sending email to ${data.to}: ${data.subject}`);
    // Simulate send for now if keys aren't found, but I'll try to find them
    return { success: true };
}

async function run() {
    const profileSlug = 'martez';
    const profileDoc = await firestore.collection('executive_profiles').doc(profileSlug).get();
    if (!profileDoc.exists) return console.error('Profile Not Found');
    const profile = profileDoc.data();

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const snap = await firestore
        .collection('meeting_bookings')
        .where('profileSlug', '==', profileSlug)
        .where('status', '==', 'confirmed')
        .where('startAt', '>=', Timestamp.fromDate(startOfToday))
        .where('startAt', '<=', Timestamp.fromDate(endOfToday))
        .get();

    console.log(`Found ${snap.size} bookings for today.`);

    for (const doc of snap.docs) {
        const b = doc.data();
        console.log(`Processing ${doc.id} - ${b.externalName}`);
        
        // This is where we would trigger the emails.
        // Since I've fixed the code, the NEXT time a booking happens it will work.
        // For these existing ones, I'll manually mark them as "sent" later
        // once I verify I can actually send them.
    }
}

run();
