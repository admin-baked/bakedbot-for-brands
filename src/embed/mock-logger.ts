export const logger = {
  debug: (msg: string, data?: unknown) => console.debug("[Embed]", msg, data),
  info: (msg: string, data?: unknown) => console.info("[Embed]", msg, data),
  warn: (msg: string, data?: unknown) => console.warn("[Embed]", msg, data),
  error: (msg: string, data?: unknown) => console.error("[Embed]", msg, data),
  critical: (msg: string, data?: unknown) =>
    console.error("[Embed] CRITICAL:", msg, data),
};
