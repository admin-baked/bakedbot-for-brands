import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({ 
        credential: applicationDefault(), 
        projectId: 'studio-567050101-bc6e8' 
    });
}

const db = getFirestore();

async function fixUser() {
    const usersSnapshot = await db
        .collection('users')
        .where('email', '==', 'martez@bakedbot.ai')
        .limit(1)
        .get();

    if (usersSnapshot.empty) {
        console.log('❌ User not found');
        return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    console.log('Current data:', {
        email: userData.email,
        role: userData.role,
        onboardingCompletedAt: userData.onboardingCompletedAt || 'NOT SET'
    });

    if (!userData.onboardingCompletedAt) {
        // Set to 30 days ago to make eligible
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        
        await userDoc.ref.update({
            onboardingCompletedAt: thirtyDaysAgo.toISOString()
        });

        console.log('✅ Added onboardingCompletedAt:', thirtyDaysAgo.toISOString());
        console.log('✅ User is now eligible for weekly nurture emails!');
    } else {
        console.log('✅ User already has onboardingCompletedAt');
    }
}

fixUser().catch(console.error);
