import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const ORG_ID = 'org_thrive_syracuse';

async function initializeFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!encodedKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not found');
  }

  const serviceAccountJson = Buffer.from(encodedKey, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(serviceAccountJson);

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: 'studio-567050101-bc6e8',
  });
}

async function auditThrivePlaybooks() {
  console.log('AUDIT_START');

  const app = await initializeFirebase();
  const db = getFirestore(app);

  try {
    const assignmentsSnap = await db
      .collection('playbook_assignments')
      .where('orgId', '==', ORG_ID)
      .get();

    console.log('ASSIGNMENT_COUNT: ' + assignmentsSnap.size);

    const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    for (const assignment of assignments) {
      console.log('ASSIGNMENT: ' + assignment.playbookId + ' | STATUS: ' + assignment.status + ' | TRIGGERS: ' + (assignment.triggerCount || 0));
      
      const playbookDoc = await db.collection('playbooks').doc(assignment.playbookId).get();
      if (playbookDoc.exists) {
          const pb = playbookDoc.data();
          console.log('GLOBAL_PB: ' + playbookDoc.id + ' | TRIGGERS: ' + JSON.stringify(pb.triggers || []));
      } else {
          console.log('GLOBAL_PB: ' + assignment.playbookId + ' | NOT_FOUND');
      }
    }

    const listenersSnap = await db
        .collection('playbook_event_listeners')
        .where('orgId', '==', ORG_ID)
        .where('status', '==', 'active')
        .get();
        
    console.log('ACTIVE_LISTENERS: ' + listenersSnap.size);
    listenersSnap.docs.forEach(doc => {
        const l = doc.data();
        console.log('LISTENER: ' + l.eventName + ' -> ' + l.playbookId);
    });

  } catch (error) {
    console.log('ERROR: ' + error.message);
  } finally {
    await app.delete();
  }
}

auditThrivePlaybooks();
