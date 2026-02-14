#!/bin/bash
# Grant secret access to all App Hosting backends
# Run this script after creating new backends in Firebase Console

PROJECT_ID="studio-567050101-bc6e8"

echo "🔐 Granting secret access to App Hosting backends..."
echo ""

# Secrets needed by all apps
COMMON_SECRETS=(
  "FIREBASE_SERVICE_ACCOUNT_KEY"
  "NEXT_PUBLIC_FIREBASE_API_KEY"
)

# Secrets needed only by operations app
OPERATIONS_SECRETS=(
  "CLAUDE_API_KEY"
  "GEMINI_API_KEY"
)

# Grant access to SEO backend
echo "📍 Granting access to bakedbot-seo..."
for SECRET in "${COMMON_SECRETS[@]}"; do
  echo "  - $SECRET"
  firebase apphosting:secrets:grantaccess $SECRET \
    --backend bakedbot-seo \
    --project $PROJECT_ID
done
echo "✅ bakedbot-seo secrets granted"
echo ""

# Grant access to Operations backend
echo "⚙️  Granting access to bakedbot-operations..."
for SECRET in "${COMMON_SECRETS[@]}" "${OPERATIONS_SECRETS[@]}"; do
  echo "  - $SECRET"
  firebase apphosting:secrets:grantaccess $SECRET \
    --backend bakedbot-operations \
    --project $PROJECT_ID
done
echo "✅ bakedbot-operations secrets granted"
echo ""

# Grant access to Shop backend
echo "🛒 Granting access to bakedbot-shop..."
for SECRET in "${COMMON_SECRETS[@]}"; do
  echo "  - $SECRET"
  firebase apphosting:secrets:grantaccess $SECRET \
    --backend bakedbot-shop \
    --project $PROJECT_ID
done
echo "✅ bakedbot-shop secrets granted"
echo ""

echo "🎉 All secrets granted! Redeploy each backend to apply changes."
echo ""
echo "Redeploy commands:"
echo "  firebase apphosting:rollouts:create bakedbot-seo --project $PROJECT_ID"
echo "  firebase apphosting:rollouts:create bakedbot-operations --project $PROJECT_ID"
echo "  firebase apphosting:rollouts:create bakedbot-shop --project $PROJECT_ID"
