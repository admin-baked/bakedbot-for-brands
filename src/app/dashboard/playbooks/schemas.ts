
import { z } from "zod";

export const PlaybookDraftSchema = z.object({
  id: z.string().optional(),
  brandId: z
    .string()
    .min(1)
    .default("demo-brand"), // if undefined, use demo-brand

  name: z.string().min(2),
  description: z.string().optional().default(""),

  status: z.enum(["draft", "active"]).default("draft"),

  agents: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  type: z.string().optional().default("generic"),
  signals: z.array(z.string()).default([]),
  targets: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),

  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type PlaybookDraft = z.infer<typeof PlaybookDraftSchema>;

// Add these:
export const SuggestPlaybookInputSchema = z.object({
  goal: z.string().min(4),
  brandId: z.string().optional(),
  context: z.string().optional(),
});

export type SuggestPlaybookInput = z.infer<typeof SuggestPlaybookInputSchema>;
