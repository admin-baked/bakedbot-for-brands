
"use server";

import { z } from "zod";
import { createServerClient } from "@/firebase/server-client";

const PlaybookDraftInputSchema = z.object({
  brandId: z.string(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
});

export type PlaybookDraftInput = z.infer<typeof PlaybookDraftInputSchema>;

export async function savePlaybookDraft(input: PlaybookDraftInput) {
  const { firestore } = await createServerClient();

  const data = PlaybookDraftInputSchema.parse(input);
  const now = new Date();

  const docRef = firestore.collection("playbookDrafts").doc();

  const draft = {
    id: docRef.id,
    ...data,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(draft);

  console.log(
    `savePlaybookDraft: created draft ${docRef.id} for brand ${data.brandId}`
  );

  return draft;
}
