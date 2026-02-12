#!/bin/bash
# Generate all slide backgrounds and agent illustrations one at a time.
# Each request takes ~15-30s. Run from project root.

BASE_URL="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/academy/slide-visuals"

SLIDE_TYPES=("title" "objectives" "content" "split" "agent" "comparison" "quote" "stat" "demo" "recap" "cta")
COLORS=("#10b981" "#3b82f6" "#8b5cf6" "#f59e0b" "#ec4899" "#ef4444")

CHARACTER_AGENTS=("craig" "money-mike" "mrs-parker" "deebo")
SCENE_AGENTS=("smokey" "craig" "pops" "ezal" "money-mike" "mrs-parker" "deebo")

echo "=== Generating Slide Backgrounds ==="
COUNT=0
TOTAL=$((${#SLIDE_TYPES[@]} * ${#COLORS[@]}))
for type in "${SLIDE_TYPES[@]}"; do
  for color in "${COLORS[@]}"; do
    COUNT=$((COUNT + 1))
    echo "[$COUNT/$TOTAL] $type / $color ..."
    RESULT=$(curl -s -X POST "$BASE_URL" \
      -H "Content-Type: application/json" \
      -d "{\"slideType\": \"$type\", \"trackColor\": \"$color\"}" \
      --max-time 120 2>&1)
    echo "  -> $(echo "$RESULT" | head -c 200)"
    sleep 1
  done
done

echo ""
echo "=== Generating Agent Character Illustrations ==="
for agent in "${CHARACTER_AGENTS[@]}"; do
  echo "Character: $agent ..."
  RESULT=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"agentId\": \"$agent\", \"illustrationType\": \"character\"}" \
    --max-time 120 2>&1)
  echo "  -> $(echo "$RESULT" | head -c 200)"
  sleep 1
done

echo ""
echo "=== Generating Agent Scene Illustrations ==="
for agent in "${SCENE_AGENTS[@]}"; do
  echo "Scene: $agent ..."
  RESULT=$(curl -s -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"agentId\": \"$agent\", \"illustrationType\": \"scene\"}" \
    --max-time 120 2>&1)
  echo "  -> $(echo "$RESULT" | head -c 200)"
  sleep 1
done

echo ""
echo "=== Done! ==="
