// src/server/agents/deebo.ts
type Channel = "email" | "sms" | "push" | "in_app";

interface ComplianceCheckInput {
  orgId: string;
  channel: Channel;
  stateCode?: string;  // e.g. "IL", "MI"
  content: string;
}

export type ComplianceResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function deeboCheckMessage(
  input: ComplianceCheckInput
): Promise<ComplianceResult> {
  // TODO: ingest state-specific rules per channel and content category.
  // For now, we’ll just block obviously bad stuff as a placeholder.
  const { content, channel } = input;

  // Very dumb placeholder, you’ll replace with rule pack
  if (/giveaway/i.test(content) && channel === "sms") {
    return {
      ok: false,
      reason: "Promo looks like a giveaway; many states restrict SMS giveaways.",
    };
  }

  return { ok: true };
}
