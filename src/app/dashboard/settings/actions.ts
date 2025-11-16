
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { FirestorePermissionError } from '@/firebase/errors';
import Papa from 'papaparse';
import { cookies } from 'next/headers';

// Schemas
const UserIdSchema = z.string().min(1, 'User ID is required.');

const ApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
  userId: UserIdSchema,
});

const FileSchema = z.instanceof(File).refine(file => file.size > 0, 'Please upload a file.').refine(file => file.type === 'text/csv', 'File must be a CSV.');

const BrandVoiceSchema = z.object({
    brandDoc: z.instanceof(File).refine(file => file.size > 0, 'Please upload a document.'),
});

const EmailSettingsSchema = z.object({
  emailProvider: z.enum(['sendgrid', 'gmail']),
  apiKey: z.string().optional(),
});

const ProductSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    name: z.string().min(1, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    price: z.coerce.number().min(0, 'Price must be non-negative'),
    imageUrl: z.string().url('A valid image URL is required'),
    imageHint: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    brandId: z.string().min(1, 'Brand ID is required'), // Added brandId
});

// Helper to verify user role
async function verifyUserRole(requiredRole: 'owner' | 'dispensary' | 'brand') {
    const { auth } = await createServerClient();
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        throw new Error('Authentication required. Please sign in.');
    }
    
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
     // The 'role' is a custom claim we set on the user's token.
    if ((decodedToken as any).role !== requiredRole) {
        throw new Error(`Permission denied. User does not have '${requiredRole}' role.`);
    }
    return decodedToken;
}


// Helper for revalidation
async function revalidateDataPaths() {
    revalidatePath('/dashboard/settings');
    revalidatePath('/'); // For public menu
    revalidatePath('/dashboard/products');
    revalidatePath('/dashboard/locations');
}

// Server Action: Save Email Settings
export async function saveEmailSettings(prevState: any, formData: FormData) {
  try {
    await verifyUserRole('owner'); // SECURITY CHECK
    const validatedFields = EmailSettingsSchema.safeParse({
        emailProvider: formData.get('emailProvider'),
        apiKey: formData.get('apiKey'),
    });

    if (!validatedFields.success) {
        return { message: 'Invalid email settings.', error: true, fieldErrors: validatedFields.error.flatten().fieldErrors };
    }
    const { emailProvider, apiKey } = validatedFields.data;

    if (emailProvider === 'sendgrid' && (!apiKey || apiKey.trim() === '')) {
        return { message: 'API Key is required for SendGrid.', error: true, fieldErrors: { apiKey: ['API Key is required.'] } };
    }
    
    if (apiKey) { /* In a real app, securely store this key */ }

    revalidatePath('/dashboard/settings');
    return { message: 'Email settings saved successfully!', error: false };
  } catch (e: any) {
    return { message: e.message, error: true };
  }
}

// Server Action: Save BakedBot API Key
export async function saveBakedBotApiKey(prevState: any, formData: FormData) {
  const { firestore } = await createServerClient();
  try {
    await verifyUserRole('owner'); // SECURITY CHECK
    const validatedFields = ApiKeySchema.safeParse({
        apiKey: formData.get('bakedbot-api-key'),
        userId: formData.get('userId'),
    });

    if (!validatedFields.success) {
        return { message: 'Invalid form data.', error: true, fieldErrors: validatedFields.error.flatten().fieldErrors };
    }
    const { apiKey, userId } = validatedFields.data;
    const userPrivateRef = firestore.doc(`user-private/${userId}`);
    
    await userPrivateRef.set({ bakedBotApiKey: apiKey }, { merge: true });
    revalidatePath('/dashboard/settings');
    return { message: 'API Key saved successfully!', error: false };
  } catch (e: any) {
     if (e instanceof FirestorePermissionError) throw e;
     return { message: e.message, error: true };
  }
}

// Server Action: Import from CSV (Generic)
async function importFromCsv(formData: FormData, fileFieldName: string, collectionName: string, idField: string) {
    try {
        await verifyUserRole('owner'); // SECURITY CHECK
        const validatedFile = FileSchema.safeParse(formData.get(fileFieldName));
        if (!validatedFile.success) {
            const fieldErrors = validatedFile.error.flatten().fieldErrors;
            const errorMessage = (fieldErrors as any)?.[fileFieldName]?.[0] || 'Invalid file.';
            return { message: errorMessage, error: true };
        }
        const { data: file } = validatedFile;

        const fileContent = await file.text();
        const parseResult = Papa.parse(fileContent, { header: true, skipEmptyLines: true, dynamicTyping: true });
        
        if (parseResult.errors.length > 0) {
            const firstError = parseResult.errors[0];
            return { message: `Error parsing CSV on row ${firstError.row}: ${firstError.message}`, error: true };
        }

        const { firestore } = await createServerClient();
        const batch = firestore.batch();

        parseResult.data.forEach((row: any) => {
            const docId = row[idField] ? String(row[idField]) : null;
            if (!docId) {
                console.warn("Skipping row with no ID:", row);
                return;
            }
            const docRef = firestore.collection(collectionName).doc(docId);
            batch.set(docRef, row);
        });

        await batch.commit();
        await revalidateDataPaths();
        return { message: `Successfully imported ${parseResult.data.length} records from ${file.name}.`, error: false };

    } catch (e: any) {
        return { message: `Failed to import: ${e.message || 'An unknown error occurred.'}`, error: true };
    }
}


export async function importProductsFromCsv(prevState: any, formData: FormData) {
    return importFromCsv(formData, 'product-csv-upload', 'products', 'id');
}

export async function importLocationsFromCsv(prevState: any, formData: FormData) {
    return importFromCsv(formData, 'location-csv-upload', 'dispensaries', 'id');
}

// Server Action: Add a single product
export async function addProductAction(prevState: any, formData: FormData): Promise<{ message: string; error: boolean; }> {
    try {
        await verifyUserRole('owner'); // SECURITY CHECK
        const validatedFields = ProductSchema.safeParse(Object.fromEntries(formData.entries()));
        if (!validatedFields.success) {
            return { error: true, message: 'Invalid product data.' };
        }

        const { firestore } = await createServerClient();
        const { id, ...productData } = validatedFields.data;
        await firestore.collection('products').doc(id).set(productData);
        await revalidateDataPaths();
        return { error: false, message: `${productData.name} has been added.` };
    } catch (e: any) {
        return { error: true, message: `Failed to add product: ${e.message}` };
    }
}


// Server Action: Train on Brand Docs
export async function trainOnBrandDocuments(prevState: any, formData: FormData) {
     try {
        await verifyUserRole('owner'); // SECURITY CHECK
        const validatedFields = BrandVoiceSchema.safeParse({ brandDoc: formData.get('brand-doc-upload') });
        if (!validatedFields.success) {
            return { message: validatedFields.error.flatten().fieldErrors.brandDoc?.[0] || 'Invalid file.', error: true };
        }
        const { brandDoc } = validatedFields.data;
        
        // In a real app, process this file for fine-tuning.
        revalidatePath('/dashboard/settings');
        return { message: `Successfully uploaded ${brandDoc.name} for training.`, error: false };

    } catch (e: any) {
        return { message: `Failed to upload document: ${e.message || 'An unknown error occurred.'}`, error: true };
    }
}
