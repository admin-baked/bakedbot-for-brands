const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function updatePlaybook() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let serviceAccount;
  try { 
    serviceAccount = JSON.parse(serviceAccountKey); 
  } catch (e) { 
    serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8')); 
  }
  
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  
  const db = admin.firestore();
  const playbookRef = db.collection('playbooks').doc('thrive_welcome_420_2026');
  
  await playbookRef.set({
    metadata: {
      productOptions: [
        {
          id: 'loc_thrive_syracuse_1515',
          name: 'Therapy .5g Preroll- Hooch Infused',
          retailPrice: 11.30,
          cost: 3.00,
          marginPct: 73,
          rationale: 'High Margin / Premium Treat - Best for immediate perceived value as an infused hook.'
        },
        {
          id: 'loc_thrive_syracuse_1586',
          name: 'Wavy Sour OG Pre-Roll 1g',
          retailPrice: 7.91,
          cost: 3.00,
          marginPct: 62,
          rationale: 'Market Leader / Value Choice - Sub-$10 price point is rare in NY and highly competitive for a wake-up call.'
        }
      ],
      ctaStrategy: 'Check-in at the door (no discount code needed)',
      lastStatusUpdate: 'Refining product selection for Wave 1',
      approvalStatus: 'pending_preview'
    }
  }, { merge: true });

  console.log('Playbook updated with product options and CTA strategy.');
}

updatePlaybook().catch(err => {
  console.error(err);
  process.exit(1);
});
