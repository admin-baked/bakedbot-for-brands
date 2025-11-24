"use server";

import { PlaybookDraftSchema, type PlaybookDraft } from "./schemas";
import { createServerClient } from "@/firebase/server-client";

export async function savePlaybookDraft(input: {
  brandId: string;
  name: string;
  description?: string;
  agents?: string[];
  tags?: string[];
}): Promise<PlaybookDraft> {
  const { firestore } = await createServerClient();

  // Let Zod handle defaults + type safety
  const baseDraft = PlaybookDraftSchema.parse({
    ...input,
    status: "draft",
  });

  const now = new Date();
  const collectionRef = firestore.collection("playbookDrafts");
  const docRef = collectionRef.doc();

  const draftToSave: PlaybookDraft = {
    ...baseDraft,
    id: docRef.id,
    createdAt: baseDraft.createdAt ?? now,
    updatedAt: now,
  };

  await docRef.set(draftToSave);

  return draftToSave;
}
