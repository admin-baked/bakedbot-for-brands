#!/bin/bash

# Script to set up Blackleaf SMS API secret in Google Secret Manager
# Usage: ./scripts/setup-blackleaf-secret.sh

set -e

PROJECT_ID="bakedbot-for-brands"
SECRET_NAME="BLACKLEAF_API_KEY"
API_KEY="T1E2U2lZNWxzY2JsN0hWU1daeV95WA=="

echo "Setting up Blackleaf API secret in Google Secret Manager..."
echo "Project: $PROJECT_ID"
echo "Secret: $SECRET_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI not found"
    echo "Please install: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if secret already exists
if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo "⚠️  Secret already exists. Updating with new value..."
    echo -n "$API_KEY" | gcloud secrets versions add "$SECRET_NAME" \
        --data-file=- \
        --project="$PROJECT_ID"
    echo "✅ Secret updated successfully"
else
    echo "Creating new secret..."
    echo -n "$API_KEY" | gcloud secrets create "$SECRET_NAME" \
        --data-file=- \
        --project="$PROJECT_ID"
    echo "✅ Secret created successfully"
fi

# Grant access to Firebase App Hosting service account
echo ""
echo "Granting access to Firebase App Hosting service account..."

# Get the default compute service account
SERVICE_ACCOUNT="firebase-adminsdk@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet

echo "✅ IAM policy binding added"
echo ""
echo "🎉 Blackleaf SMS integration is ready!"
echo ""
echo "Next steps:"
echo "1. Verify secret in Google Cloud Console:"
echo "   https://console.cloud.google.com/security/secret-manager/secret/$SECRET_NAME?project=$PROJECT_ID"
echo "2. Deploy your app to Firebase App Hosting"
echo "3. Test SMS sending with:"
echo "   await blackleafService.sendCustomMessage('+15555550100', 'Test message')"
echo ""
