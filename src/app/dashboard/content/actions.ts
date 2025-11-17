
"use server";

export type DescriptionFormState = {
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
  description?: string;
  message: string;
  data: any;
  fieldErrors?: any;
};

export type ImageFormState = {
  status: "idle" | "submitting" | "success" | "error";
  error?: string;
  imageUrl?: string | null;
  message: string;
  fieldErrors?: any;
};

export async function createProductDescription(
  prevState: DescriptionFormState,
  formData: FormData
): Promise<DescriptionFormState> {
  const prompt = formData.get("prompt")?.toString() ?? "";

  // TODO: wire to real LLM
  return {
    status: "success",
    description: prompt,
    message: "Success!",
    data: { description: prompt }
  };
}

export async function createSocialMediaImage(
  prevState: ImageFormState,
  formData: FormData
): Promise<ImageFormState> {
  const prompt = formData.get("prompt")?.toString() ?? "";

  // TODO: wire to real image API
  return {
    status: "success",
    imageUrl: "/placeholder-image-from-prompt.png",
    message: "Success!"
  };
}
