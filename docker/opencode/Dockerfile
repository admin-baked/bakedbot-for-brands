# Opencode Agent — Cloud Run container
#
# Node.js HTTP server that calls Anthropic/Gemini APIs directly with
# BakedBot repo context. Any agent (Linus, Leo, Super Users) POSTs a
# prompt and gets an AI response back.
#
# POST /run  { prompt, model?, files? } → { result, model }
# GET /health                          → { healthy: true, ... }
#
# Models: google/gemini-2.0-flash (default), google/gemini-2.5-pro,
#         anthropic/claude-haiku-4-5, anthropic/claude-sonnet-4-6

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl bash ca-certificates nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

COPY server.mjs /server.mjs

EXPOSE 8080

CMD ["/startup.sh"]
