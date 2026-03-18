const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const auth = new GoogleAuth({ keyFile: './service-account.json', scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
auth.getAccessToken().then(token => {
  const base = '/v1/projects/studio-567050101-bc6e8/databases/(default)/documents';
  const paths = ['/tenants/org_thrive_syracuse', '/tenants/org_thrive_syracuse/domain_memory/profile'];
  paths.forEach(p => {
    const req = https.request({ hostname: 'firestore.googleapis.com', path: base + p, headers: { Authorization: 'Bearer ' + token } }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => {
        const doc = JSON.parse(d);
        console.log('\n--- ' + p + ' ---');
        if (doc.error) { console.log('ERROR:', doc.error.status); return; }
        const f = doc.fields || {};
        if (Object.keys(f).length === 0) console.log('(empty doc)');
        Object.entries(f).slice(0, 15).forEach(([k,v]) => console.log(' ', k + ':', JSON.stringify(v).slice(0, 80)));
      });
    });
    req.end();
  });
}).catch(e => console.error(e.message));
