
'use server';

import { suggestPlaybook } from "@/ai/flows/suggest-playbook";
import type { PlaybookDraft } from "@/types/domain";

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
            message: `AI failed to generate a suggestion: ${e.message}`,
            error: true,
        };
    }
}
