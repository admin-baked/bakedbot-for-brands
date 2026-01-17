
import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

async function testNormalization() {
    const keyPath = path.resolve(process.cwd(), 'service-account.json');
    const rawContent = fs.readFileSync(keyPath, 'utf-8');
    const serviceAccount = JSON.parse(rawContent);
    const rawKey = serviceAccount.private_key;

    console.log('--- Key Normalization Test ---');
    console.log('Original Key Length:', rawKey.length);

    // --- REPLICATING server-client.ts LOGIC ---
    let normalizedServiceAccount = { ...serviceAccount };
    
    // Pattern to capture Header (group 1), Body (group 2), Footer (group 3)
    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
    const match = rawKey.match(pemPattern);

    if (match) {
      console.log('✅ Regex Matched');
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      const bodyRaw = match[2];
      let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

      if (bodyClean.length % 4 === 1) {
        bodyClean = bodyClean.slice(0, -1);
        bodyClean = bodyClean.slice(0, -2) + '==';
      }

      while (bodyClean.length % 4 !== 0) {
        bodyClean += '=';
      }

      const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
      normalizedServiceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;
      console.log('✅ Normalized Key Length:', normalizedServiceAccount.private_key.length);
    } else {
        console.log('❌ Regex DID NOT Match');
    }
    // ------------------------------------------

    console.log('\n--- Testing RAW Key ---');
    try {
        const authRaw = new GoogleAuth({
            credentials: { ...serviceAccount, private_key: rawKey }, // Use RAW
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const clientRaw = await authRaw.getClient();
        await clientRaw.getAccessToken();
        console.log('✅ RAW Key works!');
    } catch (e:any) {
        console.error('❌ RAW Key failed:', e.message);
    }

    console.log('\n--- Testing NORMALIZED Key ---');
    try {
        const authNorm = new GoogleAuth({
             credentials: normalizedServiceAccount, // Use NORMALIZED
             scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const clientNorm = await authNorm.getClient();
        await clientNorm.getAccessToken();
        console.log('✅ NORMALIZED Key works!');
    } catch (e:any) {
        console.error('❌ NORMALIZED Key failed:', e.message);
    }
}

testNormalization();
