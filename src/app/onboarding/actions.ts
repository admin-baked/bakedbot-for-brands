'use server';

import { createServerClient } from '@/firebase/server-client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/server/auth/auth';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

// Define the schema for the form data
const OnboardingSchema = z.object({
  role: z.enum(['brand', 'dispensary', 'customer', 'skip']),
  // Market/Location selection (state code like 'IL', 'CA')
  marketState: z.string().optional(),
  // CannMenus selection
  locationId: z.string().optional(),
  brandId: z.string().optional(),
  brandName: z.string().optional(),
  // Manual entry fields
  manualBrandName: z.string().optional(),
  manualProductName: z.string().optional(),
  manualDispensaryName: z.string().optional(),
  // Chatbot config
  chatbotPersonality: z.string().optional(),
  chatbotTone: z.string().optional(),
  chatbotSellingPoints: z.string().optional(),
  // POS Integration
  posProvider: z.enum(['dutchie', 'jane', 'none']).optional(),
  posApiKey: z.string().optional(),
  posDispensaryId: z.string().optional(), // For Jane or Dutchie ID
  features: z.string().optional(), // JSON string
  competitors: z.string().optional() // JSON or comma-separated
});

export async function completeOnboarding(prevState: any, formData: FormData) {
  try {
    const { firestore, auth } = await createServerClient();
    let user;
    try {
      user = await requireUser();
    } catch (authError) {
      logger.warn('Onboarding failed: User not authenticated.');
      return { message: 'Session expired. Please click "Log In to Continue" below.', error: true };
    }
    const uid = user.uid;

    const rawData = Object.fromEntries(formData.entries());

    // Parse features JSON if present
    let features = {};
    if (rawData.features && typeof rawData.features === 'string') {
      try {
        features = JSON.parse(rawData.features);
      } catch (e) { }
    }

    const validatedFields = OnboardingSchema.safeParse(rawData);

    if (!validatedFields.success) {
      logger.warn('Onboarding validation failed', validatedFields.error.flatten());
      return {
        message: 'Please fill out all required fields.',
        error: true,
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const {
      role, marketState, locationId, brandId, brandName,
      manualBrandName, manualProductName, manualDispensaryName,
      chatbotPersonality, chatbotTone, chatbotSellingPoints,
      posProvider, posApiKey, posDispensaryId,
      competitors
    } = validatedFields.data;

    // Proceed with Firestore logic...

    const userDocRef = firestore.collection('users').doc(uid);
    const userProfileData: Record<string, any> = {
      isNewUser: false, // Mark as onboarded
      onboardingCompletedAt: new Date().toISOString(),
      role: role === 'skip' ? 'customer' : role, // Default to customer if skipped
      // Approval Status: Customers auto-approve, Brands/Dispensaries pending
      approvalStatus: (role === 'customer' || role === 'skip') ? 'approved' : 'pending',
      // Store raw preferences
      preferences: {
        chatbotPersonality: chatbotPersonality || null,
        chatbotTone: chatbotTone || null,
        chatbotSellingPoints: chatbotSellingPoints || null
      },
      features
    };

    // Determine Final Names and IDs
    let finalBrandId = brandId;
    let finalBrandName = brandName;
    let finalRole = role;

    // Handle Manual Entry for Brand
    if (role === 'brand' && !brandId && manualBrandName) {
      // Create a new Brand Document
      const brandRepo = makeBrandRepo(firestore);
      const newBrandId = `brand_${uid.substring(0, 8)}`; // Generate ID
      await brandRepo.create(newBrandId, {
        name: manualBrandName,
        // ... defaults
      });
      finalBrandId = newBrandId;
      finalBrandName = manualBrandName;

      // Queue background data discovery job for manual entries
      await firestore.collection('data_jobs').add({
        type: 'brand_discovery',
        entityId: newBrandId,
        entityName: manualBrandName,
        entityType: 'brand',
        orgId: '', // Will be set after org creation
        userId: uid,
        status: 'pending',
        message: `Discovering data for ${manualBrandName}...`,
        progress: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0
      });
      logger.info('Created data discovery job for manual brand entry:', { brandId: newBrandId, name: manualBrandName });
    }

    // Handle Dispensary POS Config
    if (finalRole === 'dispensary' && posProvider && posProvider !== 'none') {
      userProfileData.posConfig = {
        provider: posProvider,
        apiKey: posApiKey || null, // Encrypt in production!
        dispensaryId: posDispensaryId || null,
        sourceOfTruth: 'pos',
        backupSource: 'cannmenus',
        connectedAt: new Date().toISOString(),
        status: 'active'
      };
    }

    // --- ENTERPRISE MIGRATION LOGIC ---
    let orgId = '';

    // 1. Create Organization
    if (finalRole === 'brand' || finalRole === 'dispensary') {
      const orgType = finalRole;
      // Use brandId for Brand Orgs to keep IDs consistent if possible, else generate new
      orgId = finalBrandId || (finalRole === 'brand' ? `brand-${uid.substring(0, 8)}` : `org-${uid.substring(0, 8)}`);

      const orgRef = firestore.collection('organizations').doc(orgId);
      const orgSnap = await orgRef.get();

      if (!orgSnap.exists) {
        await orgRef.set({
          id: orgId,
          name: finalBrandName || manualDispensaryName || 'My Organization',
          type: orgType,
          ownerId: uid,
          marketState: marketState || null, // Store selected market/state
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          settings: {
            policyPack: 'balanced',
            allowOverrides: true,
            hipaaMode: false
          },
          billing: {
            subscriptionStatus: 'trial'
          }
        });
      } else if (marketState) {
        // Update existing org with market if provided
        await orgRef.update({
          marketState,
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }

    // 2. Create Location (For Dispensaries)
    let newLocationId = null;
    if (finalRole === 'dispensary') {
      // If they selected a specific location from CannMenus, use that ID
      const locId = locationId || `loc-${uid.substring(0, 8)}`;
      newLocationId = locId;

      const locRef = firestore.collection('locations').doc(locId);
      await locRef.set({
        id: locId,
        orgId: orgId,
        name: manualDispensaryName || 'Main Location',
        posConfig: userProfileData.posConfig || { provider: 'none', status: 'inactive' },
        cannMenusId: locationId, // Save the mapping
        competitorIds: competitors ? competitors.split(',') : [], // Save competitors
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    // 3. Update User Profile with Enterprise Context
    const organizationIds = orgId ? [orgId] : [];

    // Update User Profile
    const updatedUserProfile: Record<string, any> = {
      ...userProfileData,
      organizationIds,
      currentOrgId: orgId || null,
      // Legacy mapping
      brandId: finalRole === 'brand' ? orgId : null,
      locationId: newLocationId || null
    };

    const updatedClaims = {
      role: finalRole,
      orgId: orgId,
      brandId: finalRole === 'brand' ? orgId : null,
      locationId: newLocationId
    };

    const finalClaims = Object.fromEntries(Object.entries(updatedClaims).filter(([_, v]) => v !== null && v !== undefined));
    const finalProfile = Object.fromEntries(Object.entries(updatedUserProfile).filter(([_, v]) => v !== null && v !== undefined));

    await userDocRef.set(finalProfile, { merge: true });
    await auth.setCustomUserClaims(uid, finalClaims);

    // --- QUEUE PRODUCT SYNC (NON-BLOCKING) ---
    let syncCount = 0;
    let productSyncJobId: string | null = null;

    if (finalRole === 'brand' && finalBrandId) {
      // Queue product sync job (don't execute here)
      const syncJobRef = await firestore.collection('data_jobs').add({
        type: 'product_sync',
        entityId: finalBrandId,
        entityName: finalBrandName || 'Brand',
        entityType: 'brand',
        orgId: orgId,
        userId: uid,
        status: 'pending', // Will be picked up by worker
        message: `Queued product sync for ${finalBrandName || 'brand'}`,
        progress: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0,
        metadata: {
          brandId: finalBrandId,
          brandName: finalBrandName,
          marketState: marketState || null,
          isCannMenus: finalBrandId.startsWith('cm_')
        }
      });
      productSyncJobId = syncJobRef.id;
      logger.info('Queued product sync job', { jobId: productSyncJobId, brandId: finalBrandId });

      // Queue dispensary import job (find retailers carrying this brand)
      await firestore.collection('data_jobs').add({
        type: 'dispensary_import',
        entityId: finalBrandId,
        entityName: finalBrandName || 'Brand',
        entityType: 'brand',
        orgId: orgId,
        userId: uid,
        status: 'pending',
        message: `Queued dispensary import for ${finalBrandName}`,
        progress: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0,
        metadata: {
          brandId: finalBrandId,
          marketState: marketState || null
        }
      });
      logger.info('Queued dispensary import job', { brandId: finalBrandId });
    } else if (finalRole === 'dispensary' && locationId) {
      // Queue dispensary sync job
      const syncJobRef = await firestore.collection('data_jobs').add({
        type: 'product_sync',
        entityId: locationId,
        entityName: manualDispensaryName || 'Dispensary',
        entityType: 'dispensary',
        orgId: orgId,
        userId: uid,
        status: 'pending',
        message: `Queued menu sync for ${manualDispensaryName || 'dispensary'}`,
        progress: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0,
        metadata: {
          locationId: locationId,
          isCannMenus: locationId.startsWith('cm_')
        }
      });
      logger.info('Queued dispensary sync job', { jobId: syncJobRef.id, locationId });

      // Queue competitor discovery
      await firestore.collection('data_jobs').add({
        type: 'competitor_discovery',
        entityId: locationId,
        entityName: manualDispensaryName || 'Dispensary',
        orgId: orgId,
        userId: uid,
        status: 'pending',
        message: `Queued competitor discovery for ${manualDispensaryName || 'dispensary'}`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: {
            locationId: locationId,
            marketState: marketState
        }
      });
      logger.info('Queued competitor discovery job', { locationId });
    }

    // --- QUEUE SEO PAGE GENERATION (NON-BLOCKING) ---
    if ((finalRole === 'brand' || finalRole === 'dispensary') && orgId) {
      await firestore.collection('data_jobs').add({
        type: 'seo_page_generation',
        entityId: orgId,
        entityName: finalBrandName || manualDispensaryName || 'Partner',
        entityType: finalRole,
        orgId: orgId,
        userId: uid,
        status: 'pending',
        message: `Queued SEO page generation`,
        progress: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0,
        metadata: {
          role: finalRole,
          locationId: locationId || null
        }
      });
      logger.info('Queued SEO page generation job', { orgId, role: finalRole });
    }

    // --- QUEUE COMPETITOR DISCOVERY (NON-BLOCKING) ---
    if ((finalRole === 'brand' || finalRole === 'dispensary') && orgId && marketState) {
      await firestore.collection('data_jobs').add({
        type: 'competitor_discovery',
        entityId: orgId,
        entityName: finalBrandName || manualDispensaryName || 'Partner',
        entityType: finalRole,
        orgId: orgId,
        userId: uid,
        status: 'pending',
        message: `Queued competitor discovery for ${marketState}`,
        progress: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attempts: 0,
        metadata: {
          marketState: marketState
        }
      });
      logger.info('Queued competitor discovery job', { orgId, marketState });
    }

    // --- SEND NOTIFICATIONS (NON-BLOCKING) ---
    try {
      const { emailService } = await import('@/lib/notifications/email-service');
      const userEmail = user.email || '';
      const userName = user.name || userEmail.split('@')[0];
      
      if (userEmail) {
        const finalEntityName = finalRole === 'brand' ? finalBrandName : manualDispensaryName;
        
        // 1. Send "Mrs. Parker" Welcome Email
        emailService.sendWelcomeEmail({ 
            email: userEmail, 
            name: userName 
        }).catch(err => logger.error('Mrs. Parker Welcome Email Failed', { error: err.message }));

        // 2. Notify Admin if pending approval (Brands/Dispensaries)
        if (finalRole === 'brand' || finalRole === 'dispensary') {
            emailService.notifyAdminNewUser({
                email: userEmail,
                name: userName,
                role: finalRole,
                company: finalEntityName
            }).catch(err => logger.error('Admin Notification Failed', { error: err.message }));
        }
      }
    } catch (emailError) {
      // Don't fail onboarding if email fails
      logger.error('Failed to trigger notifications', { error: emailError });
    }

    revalidatePath('/dashboard');
    revalidatePath('/account');

    return {
      message: 'Welcome! Your workspace is being prepared. Data import is running in the background.',
      error: false
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    logger.error('Onboarding server action failed:', { error: errorMessage });
    return { message: `Failed to save profile: ${errorMessage}`, error: true };
  }
}
