
'use server';

import { createServerClient } from '@/firebase/server-client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const LocationSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zip: z.string().min(1, 'Zip code is required'),
    phone: z.string().optional(),
    email: z.string().email('A valid fulfillment email is required.'),
});

type FormState = {
    message: string;
    error: boolean;
};

async function revalidateLocationPaths() {
    revalidatePath('/dashboard/locations');
    revalidatePath('/'); // For public locator
}

export async function addLocationAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = LocationSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: true, message: 'Invalid form data.' };
    }

    try {
        const { firestore } = await createServerClient();
        await firestore.collection('dispensaries').add(validatedFields.data);
        await revalidateLocationPaths();
        return { error: false, message: `${validatedFields.data.name} has been added.` };
    } catch (e: any) {
        return { error: true, message: `Failed to add location: ${e.message}` };
    }
}

export async function updateLocationAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = LocationSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success || !validatedFields.data.id) {
        return { error: true, message: 'Invalid form data or missing ID.' };
    }

    const { id, ...dataToUpdate } = validatedFields.data;

    try {
        const { firestore } = await createServerClient();
        await firestore.collection('dispensaries').doc(id).set(dataToUpdate, { merge: true });
        await revalidateLocationPaths();
        return { error: false, message: `${dataToUpdate.name} has been updated.` };
    } catch (e: any) {
        return { error: true, message: `Failed to update location: ${e.message}` };
    }
}

export async function removeLocationAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const id = formData.get('id') as string;
    if (!id) {
        return { error: true, message: 'Location ID is missing.' };
    }

    try {
        const { firestore } = await createServerClient();
        await firestore.collection('dispensaries').doc(id).delete();
        await revalidateLocationPaths();
        return { error: false, message: 'Location has been removed.' };
    } catch (e: any) {
        return { error: true, message: `Failed to remove location: ${e.message}` };
    }
}
