#!/bin/bash
set -e

REPO_URL="${GITHUB_REPO:-https://github.com/admin-baked/bakedbot-for-brands}"
REPO_DIR="/workspace/bakedbot-for-brands"

echo "[opencode-agent] Starting up..."

# Clone or pull latest repo
if [ -d "$REPO_DIR/.git" ]; then
    echo "[opencode-agent] Repo exists, pulling latest..."
    # Stash any untracked changes before pull to prevent ff-only failure
    git -C "$REPO_DIR" stash --include-untracked 2>/dev/null || true
    git -C "$REPO_DIR" pull --ff-only origin main
else
    echo "[opencode-agent] Cloning repo..."
    # Use GITHUB_PAT if available for private repo access
    if [ -n "$GITHUB_PAT" ]; then
        AUTH_URL=$(echo "$REPO_URL" | sed "s|https://|https://$GITHUB_PAT@|")
        git clone --depth 1 "$AUTH_URL" "$REPO_DIR"
    else
        git clone --depth 1 "$REPO_URL" "$REPO_DIR"
    fi
fi

echo "[opencode-agent] Repo ready at $REPO_DIR"
echo "[opencode-agent] Starting opencode serve on port ${PORT:-8080}..."

cd "$REPO_DIR"

# Start opencode HTTP server
# OPENCODE_SERVER_PASSWORD is injected from Secret Manager via Cloud Run
# PORT is automatically set by Cloud Run runtime
exec opencode serve \
    --port "${PORT:-8080}" \
    --hostname "0.0.0.0"
