
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

function getServiceAccount() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        return null;
    }
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        try {
            const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
            serviceAccount = JSON.parse(json);
        } catch (decodeError) {
            console.error("Failed to parse service account key from Base64 or JSON.", decodeError);
            return null;
        }
    }

   if (serviceAccount && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return serviceAccount;
}

function getAdminFirestore() {
    if (getApps().length === 0) {
        const serviceAccount = getServiceAccount();
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        } else {
            initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
            });
        }
    }
    return getFirestore();
}

const adminDb = getAdminFirestore();

async function checkTenant(tenantId: string) {
    console.log(`Checking Tenant: ${tenantId}...`);
    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    const tenantSnap = await tenantRef.get();
    
    if (tenantSnap.exists) {
        const data = tenantSnap.data();
        console.log(`Current Plan: ${data?.planId || 'undefined'}`);

        if (data?.planId !== 'empire') {
            console.log('Updating plan to "empire"...');
            await tenantRef.update({ 
                planId: 'empire',
                updatedAt: new Date().toISOString()
            });
            console.log('Plan updated successfully.');
        } else {
             console.log('Plan is already correct.');
        }
        console.log(`Current Products: ${await getProductCount(tenantId)}`);
    } else {
         console.log('Tenant doc not found.');
    }
}

async function getProductCount(tenantId: string) {
    const productsSnap = await adminDb.collection('tenants')
        .doc(tenantId)
        .collection('products')
        .count()
        .get();
    return productsSnap.data().count;
}


async function main() {
    // 1. Find User by specific email (failed) -> try broad search
    console.log('Searching for users like "essex"...');
    const usersSnap = await adminDb.collection('users')
        .where('email', '>=', 'essex')
        .where('email', '<=', 'essex\uf8ff')
        .get();

    if (usersSnap.empty) {
        console.error('No users found starting with "essex".');
        
        // Search Organizations
        console.log('Searching for organizations with name starting with "Essex"...');
        const orgsSnap = await adminDb.collection('organizations')
            .where('name', '>=', 'Essex')
            .where('name', '<=', 'Essex\uf8ff')
            .get();
            
        if (orgsSnap.empty) { 
             console.log('No "Essex" organizations found. Trying "essex" (lowercase)...');
             const orgsLowSnap = await adminDb.collection('organizations')
                .where('name', '>=', 'essex')
                .where('name', '<=', 'essex\uf8ff')
                .get();
             orgsLowSnap.forEach(doc => console.log(`Found Org (low): ${doc.id} - ${doc.data().name}`));
        }

        orgsSnap.forEach(doc => {
            console.log(`Found Org: ${doc.id} - ${doc.data().name}`);
        });
        return;
    }

    // Found users
    for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        console.log(`Found User: ${userDoc.id} (${userData.email})`);
        
        const tenantId = userData.activeTenantId || userData.organizationId;
        if(tenantId) {
            await checkTenant(tenantId);
        } else {
            console.log('No tenant ID found check organizations...');
             if(userData.organizationIds && userData.organizationIds.length > 0) {
                 for(const orgId of userData.organizationIds) {
                      await checkTenant(orgId);
                 }
             }
        }
    }
}

main().catch(console.error);
