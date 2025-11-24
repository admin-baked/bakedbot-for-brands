'use server';

import { suggestPlaybook as suggestPlaybookFlow } from "@/ai/flows/suggest-playbook";
import { PlaybookDraftSchema, type SuggestPlaybookInput, type PlaybookDraft } from "./schemas";

// --- Server Actions ---

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
        const suggestion = await suggestPlaybookFlow({
          goal: command,
        });
        
        // Ensure the AI's output conforms to our schema before sending it to the client.
        const validatedSuggestion = PlaybookDraftSchema.parse(suggestion);
        
        return {
            message: 'Suggestion generated successfully!',
            error: false,
            suggestion: validatedSuggestion,
        };
    } catch (e: any) {
        return {
            message: `AI generation failed: ${e.message}`,
            error: true,
        };
    }
}
