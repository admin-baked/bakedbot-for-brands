const { GoogleAuth } = require('google-auth-library');
const https = require('https');
const auth = new GoogleAuth({ keyFile: './service-account.json', scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
auth.getAccessToken().then(token => {
  // Search users where orgId or currentOrgId = org_thrive_syracuse
  const projectId = 'studio-567050101-bc6e8';
  const body = JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: { fieldFilter: { field: { fieldPath: 'currentOrgId' }, op: 'EQUAL', value: { stringValue: 'org_thrive_syracuse' } } },
      limit: 5
    }
  });
  const req = https.request({
    hostname: 'firestore.googleapis.com',
    path: '/v1/projects/' + projectId + '/databases/(default)/documents:runQuery',
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': body.length }
  }, res => {
    let d = ''; res.on('data', x => d += x);
    res.on('end', () => {
      const docs = JSON.parse(d);
      docs.forEach(r => {
        if (!r.document) return;
        const f = r.document.fields || {};
        console.log('User:', f.email?.stringValue, '| orgId:', f.currentOrgId?.stringValue, '| role:', f.role?.stringValue, '| displayName:', f.displayName?.stringValue);
      });
    });
  });
  req.write(body); req.end();
}).catch(e => console.error(e.message));
