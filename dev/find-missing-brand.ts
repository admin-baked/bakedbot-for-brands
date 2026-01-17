
import * as fs from 'fs';
import { createServerClient } from '@/firebase/server-client';

async function main() {
  const brandName = "Melanie's Ecstatic Edibles";
  let output = `Searching for brand: "${brandName}"...\n`;
  
  try {
    const { firestore } = await createServerClient();
    
    // 1. Search in 'crm_brands'
    const brandSnap = await firestore.collection('crm_brands')
      .where('name', '==', brandName)
      .limit(1)
      .get();

    if (!brandSnap.empty) {
      const doc = brandSnap.docs[0];
      const data = doc.data();
      output += `[FOUND IN CRM_BRANDS]\n`;
      output += `ID: ${doc.id}\n`;
      output += `Name: ${data.name}\n`;
      output += `Email: ${data.email || 'N/A'}\n`;
      output += `Claim Status: ${data.claimStatus}\n`;
      output += `Claimed By: ${data.claimedBy || 'N/A'}\n`;
      output += `Stripe Customer ID: ${data.stripeCustomerId || 'N/A'}\n`;
    } else {
      output += `[NOT FOUND in crm_brands]\n`;
    }

    // 2. Search in 'users' by orgName or displayName fuzzy match (manual scan of recent)
    output += `\nScanning recent users for similar names...\n`;
    const userSnap = await firestore.collection('users')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    userSnap.forEach(doc => {
      const data = doc.data();
      const match = (data.orgName && data.orgName.includes('Ecstatic')) || 
                    (data.displayName && data.displayName.includes('Melanie'));
      
      if (match) {
        output += `[POSSIBLE USER MATCH]\n`;
        output += `ID: ${doc.id}\n`;
        output += `Email: ${data.email}\n`;
        output += `Name: ${data.displayName}\n`;
        output += `Org: ${data.orgName}\n`;
      }
    });

  } catch (error: any) {
    output += `Error: ${error.message}\n`;
  }

  console.log(output);
  fs.writeFileSync('dev/brand-search-status.txt', output);
}

main();
