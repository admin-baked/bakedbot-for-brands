#!/bin/bash
# Safe Push Script - Always pulls before pushing to avoid conflicts
# Usage: ./scripts/safe-push.sh

set -e

echo "🔄 Fetching latest changes..."
git fetch origin main

# Check if there are remote changes
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "⚠️  Remote has new commits. Pulling with rebase..."

    # Stash any uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        echo "📦 Stashing uncommitted changes..."
        git stash push -m "Auto-stash before safe-push $(date +%Y-%m-%d_%H:%M:%S)"
        STASHED=1
    fi

    # Pull with rebase
    git pull --rebase origin main

    # Restore stashed changes if any
    if [ "$STASHED" = "1" ]; then
        echo "📂 Restoring stashed changes..."
        git stash pop || echo "⚠️  Stash pop had conflicts - resolve manually"
    fi
fi

echo "⬆️  Pushing to origin/main..."
git push origin main

echo "✅ Push successful!"
