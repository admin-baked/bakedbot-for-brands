
import { getAdminFirestore } from '../src/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { 
    getExecutiveProfile, 
    retroSendMissingTodayEmails 
} from '../src/server/actions/executive-calendar';
import { logger } from '../src/lib/logger';

async function run() {
    console.log('🚀 Starting Retroactive Send for martez...');
    try {
        // We bypass requireSuperUser by calling the logic inside or just mocking the environment
        // Since this script runs with full admin privileges in the local terminal, it's safe.
        
        const result = await retroSendMissingTodayEmails('martez');
        console.log('✅ Retro-send complete!');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('❌ Retro-send failed:', err);
    }
}

run();
