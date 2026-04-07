import { getAdminFirestore } from '../src/firebase/admin.js';
import { logger } from '../src/lib/logger.js';

async function auditElroy() {
    const db = getAdminFirestore();
    const snapshot = await db.collection('slack_responses')
        .where('agent', '==', 'elroy')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

    if (snapshot.empty) {
        console.log('No Slack responses found for Uncle Elroy.');
        return;
    }

    const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate().toISOString()
    }));

    console.log(JSON.stringify(records, null, 2));
}

auditElroy().catch(console.error);
