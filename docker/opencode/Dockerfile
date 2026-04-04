# Opencode Agent — Cloud Run container
#
# Runs `opencode serve` as a headless HTTP API so any BakedBot agent
# (Linus, Leo, Super Users) can delegate focused coding tasks without
# consuming Claude/Anthropic budget on routine work.
#
# Default model: Opencode Zen (free, no API key required)
# Premium path:  Antigravity OAuth → gemini-3-pro / claude-opus-4-5-thinking
#
# NOTE: Must use Debian (glibc) — Alpine musl is incompatible with the opencode Go binary.
#
# Build:
#   docker build -t opencode-agent ./docker/opencode
# Deploy:
#   gcloud run deploy opencode-agent --source ./docker/opencode \
#     --region us-central1 ...

FROM debian:bookworm-slim

# System deps: git (repo clone), curl (opencode install), nodejs (npm wrapper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl bash ca-certificates nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install opencode via official install script (downloads correct glibc Go binary)
RUN curl -fsSL https://opencode.ai/install | bash

# Ensure opencode is on PATH
ENV PATH="/root/.local/bin:/root/.opencode/bin:$PATH"

WORKDIR /workspace

# Startup script: clone repo → start opencode serve
COPY startup.sh /startup.sh
RUN chmod +x /startup.sh

# opencode config: Zen models by default, ANTHROPIC_API_KEY injected at runtime for premium
RUN mkdir -p /root/.config/opencode
COPY opencode.json /root/.config/opencode/opencode.json

EXPOSE 8080

CMD ["/startup.sh"]
