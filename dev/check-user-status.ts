
import * as fs from 'fs';
import { createServerClient } from '@/firebase/server-client';

async function main() {
  const email = 'ecstaticedibles@bakedbot.ai';
  let output = `Checking status for: ${email}...\n`;
  
  try {
    const { firestore } = await createServerClient();
    
    const snapshot = await firestore.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      output += 'User NOT FOUND in Firestore.\n';
    } else {
      const doc = snapshot.docs[0];
      const data = doc.data();

      output += 'User Found:\n';
      output += `ID: ${doc.id}\n`;
      output += `Email: ${data.email}\n`;
      output += `Display Name: ${data.displayName}\n`;
      output += `Role: ${data.role}\n`;
      output += `Approval Status: ${data.approvalStatus || 'N/A (Likely approved/legacy)'}\n`;
      output += `Disabled: ${data.disabled || false}\n`;
      output += `Org Type: ${data.orgType || 'N/A'}\n`;
    }
  } catch (error: any) {
    output += `Error checking user status: ${error.message}\n`;
  }

  console.log(output);
  fs.writeFileSync('dev/user-status.txt', output);
}

main();
