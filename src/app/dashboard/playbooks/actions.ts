"use server";

import { z } from "zod";
import { createServerClient } from "@/firebase/server-client";
import { requireUser } from "@/server/auth/auth";

import { logger } from '@/lib/logger';

const PlaybookDraftInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  agent: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(z.any()).optional(),
  triggers: z.array(z.any()).optional(),
});

export type PlaybookDraftInput = z.infer<typeof PlaybookDraftInputSchema>;

export async function savePlaybookDraft(input: PlaybookDraftInput) {
  const { firestore } = await createServerClient();
  const user = await requireUser();

  const validated = PlaybookDraftInputSchema.parse(input);
  const data = {
    ...validated,
    description: validated.description ?? "",
    steps: validated.steps ?? [],
    triggers: validated.triggers ?? [],
  };
  const now = new Date();

  const docRef = firestore.collection("playbookDrafts").doc();

  const draft = {
    id: docRef.id,
    brandId: user.brandId || user.uid,
    ownerId: user.uid,
    name: data.name,
    description: data.description,
    agent: data.agent,
    category: data.category,
    steps: data.steps,
    triggers: data.triggers,
    status: "draft" as const,
    createdAt: now,
    updatedAt: now,
  };

  await docRef.set(draft);

  logger.info(
    `savePlaybookDraft: created draft ${docRef.id} for brand ${draft.brandId}`
  );

  return draft;
}
