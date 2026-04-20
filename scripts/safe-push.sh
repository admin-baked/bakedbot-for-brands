#!/bin/bash
# Safe Push Script — CI health check + pull + type check + simplify gate + push + verify
# Usage: ./scripts/safe-push.sh [--skip-ci-check] [--skip-tests]

set -e

SKIP_CI_CHECK=0
SKIP_TESTS=0
for arg in "$@"; do
    case "$arg" in
        --skip-ci-check) SKIP_CI_CHECK=1 ;;
        --skip-tests) SKIP_TESTS=1 ;;
    esac
done

# ── Step 1: Check previous build health ─────────────────────
if [ "$SKIP_CI_CHECK" = "0" ]; then
    echo ""
    echo "=== Step 1: Previous Build Health ==="
    node scripts/check-ci-health.mjs --strict || {
        echo ""
        echo "Previous build has failures. Fix them first or use --skip-ci-check to override."
        exit 1
    }
fi

# ── Step 2: Fetch + rebase ──────────────────────────────────
echo ""
echo "=== Step 2: Sync with Remote ==="
git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "Remote has new commits. Pulling with rebase..."

    if ! git diff-index --quiet HEAD --; then
        echo "Stashing uncommitted changes..."
        git stash push -m "Auto-stash before safe-push $(date +%Y-%m-%d_%H:%M:%S)"
        STASHED=1
    fi

    git pull --rebase origin main

    if [ "$STASHED" = "1" ]; then
        echo "Restoring stashed changes..."
        git stash pop || echo "Stash pop had conflicts - resolve manually"
    fi
fi

# ── Step 3: Type check ─────────────────────────────────────
echo ""
echo "=== Step 3: Type Check ==="
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental false
echo "Type check passed."

# ── Step 4: Simplify gate ──────────────────────────────────
echo ""
echo "=== Step 4: Simplify Gate ==="
npm run -s simplify:verify

# ── Step 5: Push ───────────────────────────────────────────
echo ""
echo "=== Step 5: Push to origin/main ==="
git push origin main
echo "Push successful!"

# ── Step 6: Post-push verification ─────────────────────────
echo ""
echo "=== Step 6: Post-Push CI Verification ==="
echo "Waiting 30s for CI to start..."
sleep 30

echo "Checking CI status (will poll for up to 10 minutes)..."
node scripts/gh-commit-checks.mjs wait 2>/dev/null || {
    echo ""
    echo "CI polling failed or timed out. Check manually: npm run gh:checks"
}

echo ""
echo "=== Safe Push Complete ==="
