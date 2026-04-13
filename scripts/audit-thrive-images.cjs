const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const env = require('fs').readFileSync('.env.local', 'utf8');
const saMatch = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(saMatch[1].trim(), 'base64').toString('utf-8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products')
    .collection('items').get().then(snap => {
    const docs = snap.docs.map(d => d.data());
    const total = docs.length;
    const hasGcs = docs.filter(d => d.imageUrl && d.imageUrl.includes('storage.googleapis.com')).length;
    const hasPlaceholder = docs.filter(d => !d.imageUrl || d.imageUrl === '/icon-192.png' || d.imageUrl === '').length;
    const bySource = {};
    docs.forEach(d => { const s = d.imageSource || 'none'; bySource[s] = (bySource[s]||0) + 1; });
    console.log('=== Thrive Image Coverage ===');
    console.log('Total products:', total);
    console.log('Has GCS image:', hasGcs, '(' + Math.round(hasGcs/total*100) + '%)');
    console.log('Still missing:', hasPlaceholder);
    console.log('By source:', JSON.stringify(bySource, null, 2));
    process.exit(0);
});
