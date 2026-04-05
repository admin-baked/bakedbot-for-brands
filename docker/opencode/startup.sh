#!/bin/bash
set -e

REPO_URL="${GITHUB_REPO:-https://github.com/admin-baked/bakedbot-for-brands}"
REPO_DIR="/workspace/bakedbot-for-brands"
export REPO_DIR

echo "[opencode-agent] Starting up..."

# Clone or pull latest repo for file context
if [ -d "$REPO_DIR/.git" ]; then
    echo "[opencode-agent] Repo exists, pulling latest..."
    git -C "$REPO_DIR" stash --include-untracked 2>/dev/null || true
    git -C "$REPO_DIR" pull --ff-only origin main
else
    echo "[opencode-agent] Cloning repo..."
    if [ -n "$GITHUB_PAT" ]; then
        AUTH_URL=$(echo "$REPO_URL" | sed "s|https://|https://$GITHUB_PAT@|")
        git clone --depth 1 "$AUTH_URL" "$REPO_DIR"
    else
        git clone --depth 1 "$REPO_URL" "$REPO_DIR"
    fi
fi

echo "[opencode-agent] Repo ready. Starting server..."

# Strip trailing \r\n that Cloud Run may inject when reading secret values
OPENCODE_SERVER_PASSWORD=$(printf '%s' "$OPENCODE_SERVER_PASSWORD" | tr -d '\r\n')
export OPENCODE_SERVER_PASSWORD

exec node /server.mjs
