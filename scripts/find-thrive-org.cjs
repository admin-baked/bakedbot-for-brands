const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const auth = new GoogleAuth({ keyFile: './service-account.json', scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
auth.getAccessToken().then(token => {
  const projectId = 'studio-567050101-bc6e8';
  const base = '/v1/projects/' + projectId + '/databases/(default)/documents';
  
  // Check org_profiles/org_thrive_syracuse and brandGuides/org_thrive_syracuse
  ['org_profiles/org_thrive_syracuse', 'brandGuides/org_thrive_syracuse', 'organizations/org_thrive_syracuse'].forEach(p => {
    const req = https.request({ hostname: 'firestore.googleapis.com', path: base + '/' + p, headers: { Authorization: 'Bearer ' + token } }, res => {
      let d = ''; res.on('data', x => d += x);
      res.on('end', () => {
        const doc = JSON.parse(d);
        console.log('\n--- ' + p + ' ---');
        if (doc.error) { console.log('NOT FOUND'); return; }
        const f = doc.fields || {};
        Object.entries(f).slice(0, 10).forEach(([k,v]) => console.log(' ', k + ':', JSON.stringify(v).slice(0, 80)));
      });
    });
    req.end();
  });
}).catch(e => console.error(e.message));
