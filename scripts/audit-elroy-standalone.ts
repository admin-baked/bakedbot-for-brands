import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function auditElroy() {
    // Manually initialize to avoid 'server-only' issues
    const saPath = path.resolve(process.cwd(), 'service-account.json');
    if (!fs.existsSync(saPath)) {
        throw new Error('service-account.json not found in root');
    }
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

    if (getApps().length === 0) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }

    const db = getFirestore();
    const snapshot = await db.collection('slack_responses')
        .where('agent', '==', 'elroy')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

    if (snapshot.empty) {
        console.log('No Slack responses found for Uncle Elroy.');
        return;
    }

    const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            timestamp: data.timestamp?.toDate().toISOString() ?? 'N/A',
            userMessage: data.userMessage,
            agentResponse: data.agentResponse,
            channel: data.channelName || data.channel,
            requestType: data.requestType
        };
    });

    console.log(JSON.stringify(records, null, 2));
}

auditElroy().catch(console.error);
