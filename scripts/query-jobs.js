const admin = require('firebase-admin');

// Since we are running locally, we need to ensure either emulator is used or we have proper credentials.
// A safe fallback to check local jobs if running against the emulator.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

try {
  admin.initializeApp({
    projectId: 'studio-567050101'
  });
} catch (e) {}

const db = admin.firestore();

async function checkJobs() {
    try {
        console.log("Checking Local Emulator Firestore jobs...");
        const snapshot = await db.collection('jobs')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
            
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Job ${doc.id}: Status: ${data.status}`);
            if (data.error) {
                console.log(`   ERROR: ${data.error}`);
            }
        });
    } catch (e) {
        console.error("Failed to query:", e);
    }
}

checkJobs();
