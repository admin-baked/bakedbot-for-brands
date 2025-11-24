"use server";

import { SuggestPlaybookInputSchema } from "./schemas";
import type { SuggestPlaybookInput } from "./schemas";
import { suggestPlaybookFlow } from "@/ai/flows/suggest-playbook"; // if you have it

export type SuggestionFormState = {
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
  suggestion?: string;
};

export async function createPlaybookSuggestion(
  prevState: SuggestionFormState,
  formData: FormData
): Promise<SuggestionFormState> {
  try {
    const input: SuggestPlaybookInput = {
      goal: formData.get("goal")?.toString() ?? "",
      brandId: formData.get("brandId")?.toString() ?? undefined,
      context: formData.get("context")?.toString() ?? undefined,
    };

    const parsed = SuggestPlaybookInputSchema.parse(input);

    // If you have an AI flow, call it; otherwise just echo
    if (typeof suggestPlaybookFlow === "function") {
      const result = await suggestPlaybookFlow(parsed);
      return {
        status: "success",
        suggestion: result?.name ?? "",
      };
    }

    return {
      status: "success",
      suggestion: parsed.goal,
    };
  } catch (err: any) {
    console.error("createPlaybookSuggestion error", err);
    return {
      status: "error",
      error: "Failed to generate suggestion.",
    };
  }
}
