#!/usr/bin/env tsx
/**
 * Setup Super User Account
 *
 * Creates/updates the super user account with admin privileges.
 * Credentials are read from environment variables for security.
 *
 * Usage:
 *   npx tsx scripts/setup-super-user.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
function initializeFirebase() {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
    }

    // Decode base64 service account
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
    );

    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  return {
    auth: getAuth(),
    db: getFirestore()
  };
}

async function setupSuperUser() {
  console.log('🔧 Setting up Super User account...\n');

  const email = process.env.SUPER_USER_EMAIL;
  const password = process.env.SUPER_USER_PASSWORD;

  if (!email || !password) {
    console.error('❌ Error: SUPER_USER_EMAIL and SUPER_USER_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  const { auth, db } = initializeFirebase();

  try {
    // Step 1: Create or update user in Firebase Auth
    console.log('📧 Email:', email);

    let uid: string;
    let userExists = false;

    try {
      const existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
      userExists = true;
      console.log('✅ User already exists in Auth');

      // Update password
      await auth.updateUser(uid, { password });
      console.log('✅ Password updated');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({
          email,
          password,
          emailVerified: true,
          displayName: 'Martez (Super User)'
        });
        uid = newUser.uid;
        console.log('✅ User created in Auth');
      } else {
        throw error;
      }
    }

    // Step 2: Set up Firestore user document with super_user role
    console.log('\n📝 Setting up Firestore user document...');

    const userDoc = {
      email,
      displayName: 'Martez',
      role: 'super_user',
      roles: ['super_user', 'admin', 'brand_owner'],
      permissions: {
        all: true,
        canManageUsers: true,
        canManageBrands: true,
        canManageAgents: true,
        canAccessAllData: true,
        canManageSystem: true,
        canViewAnalytics: true,
        canManageBilling: true
      },
      profile: {
        firstName: 'Martez',
        lastName: '',
        company: 'BakedBot',
        title: 'Founder & CEO'
      },
      settings: {
        emailNotifications: true,
        smsNotifications: true,
        theme: 'dark',
        language: 'en'
      },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
        setupCompleted: true,
        isSuperUser: true
      }
    };

    await db.collection('users').doc(uid).set(userDoc, { merge: true });
    console.log('✅ Firestore user document created/updated');

    // Step 3: Set custom claims for role-based access
    console.log('\n🔐 Setting custom claims...');

    await auth.setCustomUserClaims(uid, {
      role: 'super_user',
      admin: true,
      superUser: true,
      permissions: ['all']
    });
    console.log('✅ Custom claims set');

    // Step 4: Create auto-login token (optional)
    console.log('\n🎫 Generating custom token for auto-login...');

    const customToken = await auth.createCustomToken(uid);
    console.log('✅ Custom token generated');

    // Save to a secure file (not committed to git)
    const fs = require('fs');
    const path = require('path');

    const tokenFile = path.join(process.cwd(), '.super-user-token');
    fs.writeFileSync(tokenFile, customToken, 'utf-8');
    console.log(`✅ Token saved to: ${tokenFile}`);

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Super User Setup Complete!');
    console.log('═'.repeat(60));
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 UID: ${uid}`);
    console.log(`👤 Role: super_user`);
    console.log(`🎫 Token: Saved to .super-user-token`);

    console.log('\n📝 Next Steps:');
    console.log('  1. Start your app: npm run dev');
    console.log('  2. Go to: http://localhost:3000/admin-login');
    console.log('  3. Sign in with your credentials');
    console.log('  4. Or use the auto-login script: npx tsx scripts/auto-login.ts');

    console.log('\n⚠️  Security Notes:');
    console.log('  - Credentials are stored in .env.local (not committed to git)');
    console.log('  - Token file (.super-user-token) is also git-ignored');
    console.log('  - Keep these files secure and never share them');

  } catch (error) {
    console.error('\n❌ Error setting up super user:', error);
    process.exit(1);
  }
}

// Run setup
setupSuperUser().then(() => {
  console.log('\n✨ Done!\n');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
