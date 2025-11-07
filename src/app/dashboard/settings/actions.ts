'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/firebase/server-client';
import { doc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Schema for API Key
const ApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
});

// Schema for Product Import
const ProductImportSchema = z.object({
    productsFile: z.instanceof(File).refine(file => file.size > 0, 'Please upload a CSV file.').refine(file => file.type === 'text/csv', 'File must be a CSV.'),
});

// Schema for Brand Voice
const BrandVoiceSchema = z.object({
    brandDoc: z.instanceof(File).refine(file => file.size > 0, 'Please upload a document.'),
});

const EmailSettingsSchema = z.object({
  emailProvider: z.enum(['sendgrid', 'gmail']),
  apiKey: z.string().optional(),
})

export async function saveEmailSettings(prevState: any, formData: FormData) {
  // In a real app, you'd encrypt and securely store the API key.
  // For this demo, we'll just confirm we received it.
  const validatedFields = EmailSettingsSchema.safeParse({
    emailProvider: formData.get('emailProvider'),
    apiKey: formData.get('apiKey'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid email settings.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { emailProvider, apiKey } = validatedFields.data;

  if (emailProvider === 'sendgrid' && (!apiKey || apiKey.trim() === '')) {
     return {
      message: 'API Key is required for SendGrid.',
      error: true,
      fieldErrors: { apiKey: ['API Key is required.'] }
    };
  }
  
  console.log(`Email provider set to: ${emailProvider}`);
  if (apiKey) {
    console.log('API Key received (handling would be secure in production)');
  }

  revalidatePath('/dashboard/settings');
  
  return {
    message: 'Email settings saved successfully!',
    error: false,
  };
}

export async function saveBakedBotApiKey(prevState: any, formData: FormData) {
  const { auth, firestore } = await createServerClient();
  const user = auth.currentUser;

  if (!user) {
    return {
      message: 'You must be logged in to save an API key.',
      error: true,
    };
  }

  const validatedFields = ApiKeySchema.safeParse({
    apiKey: formData.get('bakedbot-api-key'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data. Please check your inputs.',
      error: true,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { apiKey } = validatedFields.data;
  const userPrivateRef = doc(firestore, 'user-private', user.uid);
  
  setDoc(userPrivateRef, { bakedBotApiKey: apiKey }, { merge: true })
      .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: userPrivateRef.path,
              operation: 'update',
              requestResourceData: { bakedBotApiKey: 'REDACTED' }
          });
          errorEmitter.emit('permission-error', permissionError);
      });

  revalidatePath('/dashboard/settings');

  return {
    message: 'API Key saved successfully!',
    error: false,
  };
}


export async function importProductsFromCsv(prevState: any, formData: FormData) {
    const validatedFields = ProductImportSchema.safeParse({
        productsFile: formData.get('product-csv-upload'),
    });

    if (!validatedFields.success) {
        return {
            message: validatedFields.error.flatten().fieldErrors.productsFile?.[0] || 'Invalid file.',
            error: true,
        };
    }
    
    const { productsFile } = validatedFields.data;

    try {
        const fileContent = await productsFile.text();
        // In a real app, you would parse the CSV and update the database.
        // For now, we'll just log it to show it works.
        console.log('--- Simulating Product Import ---');
        console.log(`File: ${productsFile.name}, Size: ${productsFile.size} bytes`);
        console.log('CSV Content:', fileContent.substring(0, 200) + '...');
        console.log('---------------------------------');

        revalidatePath('/dashboard/settings');

        return {
            message: `Successfully imported products from ${productsFile.name}.`,
            error: false,
        };

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        console.error("Product import error:", errorMessage);
        return {
            message: `Failed to import products: ${errorMessage}`,
            error: true,
        };
    }
}

export async function trainOnBrandDocuments(prevState: any, formData: FormData) {
     const validatedFields = BrandVoiceSchema.safeParse({
        brandDoc: formData.get('brand-doc-upload'),
    });

     if (!validatedFields.success) {
        return {
            message: validatedFields.error.flatten().fieldErrors.brandDoc?.[0] || 'Invalid file.',
            error: true,
        };
    }

    const { brandDoc } = validatedFields.data;

    try {
        // In a real app, you would process this file and use it to fine-tune an LLM.
        // For now, we'll log it to show the mechanism works.
        console.log('--- Simulating Brand Voice Training ---');
        console.log(`File: ${brandDoc.name}, Type: ${brandDoc.type}, Size: ${brandDoc.size} bytes`);
        console.log('This file would now be sent to a training pipeline.');
        console.log('-------------------------------------');

        revalidatePath('/dashboard/settings');

        return {
            message: `Successfully uploaded ${brandDoc.name} for training.`,
            error: false,
        };

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        console.error("Brand voice training error:", errorMessage);
        return {
            message: `Failed to upload document: ${errorMessage}`,
            error: true,
        };
    }
}
