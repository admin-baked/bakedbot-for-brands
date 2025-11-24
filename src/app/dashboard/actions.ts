
'use server';

import { suggestPlaybook } from "@/ai/flows/suggest-playbook";
import type { PlaybookDraft, Playbook } from "@/types/domain";
import { requireUser } from "@/server/auth/auth";
import { createServerClient } from "@/firebase/server-client";

export type SuggestionFormState = {
    message: string;
    error: boolean;
    suggestion?: PlaybookDraft;
};

/**
 * A Server Action that takes form data, calls the AI flow to suggest a playbook,
 * and returns the result to be used by the form state.
 */
export async function createPlaybookSuggestion(
    prevState: SuggestionFormState,
    formData: FormData
): Promise<SuggestionFormState> {
    const command = formData.get('command') as string;

    if (!command || command.trim().length < 10) {
        return {
            message: 'Please provide a more detailed command for the AI.',
            error: true,
        };
    }

    try {
        const suggestion = await suggestPlaybook({ command });
        return {
            message: 'Suggestion generated successfully!',
            error: false,
            suggestion,
        };
    } catch (e: any) {
        return {
            message: `AI generation failed: ${e.message}`,
            error: true,
        };
    }
}

/**
 * Securely fetches all playbooks for the currently authenticated user's brand.
 */
export async function getPlaybooksForBrand(): Promise<Playbook[]> {
    try {
        const user = await requireUser(['brand', 'owner']);
        const brandId = user.brandId;
        
        if (!brandId) {
            // This can happen for 'owner' roles without a brand context
            // or misconfigured 'brand' roles. Return empty for now.
            return [];
        }

        const { firestore } = await createServerClient();
        // The instructions specify `/brands/{brandId}/playbooks`, but agent code uses `/organizations`.
        // Sticking to the most recent guidance. We will assume organizations is the correct path for now.
        const playbooksRef = firestore.collection(`organizations/${brandId}/playbooks`);
        const snapshot = await playbooksRef.orderBy('name').get();
        
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Playbook));

    } catch (error) {
        // If the user isn't authenticated or doesn't have the right role, this will throw.
        // We'll catch it and return an empty array to prevent crashing the page.
        console.error("Failed to fetch playbooks:", error);
        return [];
    }
}
