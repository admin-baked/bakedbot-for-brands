
import { adminDb } from '../src/server/firebase-admin.ts';

async function main() {
    console.log('Searching for user essexapothercary@bakedbot.ai...');
    
    // 1. Find User
    const usersSnap = await adminDb.collection('users')
        .where('email', '==', 'essexapothercary@bakedbot.ai')
        .limit(1)
        .get();

    if (usersSnap.empty) {
        console.error('User not found!');
        
        // Try searching for just "Essex" in organizations
        console.log('Searching for organizations with name "Essex"...');
        const orgsSnap = await adminDb.collection('organizations')
            .where('name', '>=', 'Essex')
            .where('name', '<=', 'Essex\uf8ff')
            .get();
            
        orgsSnap.forEach(doc => {
            console.log(`Found Org: ${doc.id} - ${doc.data().name}`);
        });
        return;
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    console.log(`Found User: ${userDoc.id}`);
    console.log(`Tenant/Org ID: ${userData.activeTenantId || userData.organizationId}`);
    
    // 2. Check if Tenant Exists
    const tenantId = userData.activeTenantId || userData.organizationId;
    if (tenantId) {
        const tenantRef = adminDb.collection('tenants').doc(tenantId);
        const tenantSnap = await tenantRef.get();
        
        if (tenantSnap.exists) {
            console.log(`\nTenant Found: ${tenantId}`);
            const data = tenantSnap.data();
            console.log(`Current Plan: ${data?.planId || 'undefined'}`);

            // Force update to Empire plan
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
            console.error(`Tenant ${tenantId} does not exist in 'tenants' collection.`);
        }
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

main().catch(console.error);
