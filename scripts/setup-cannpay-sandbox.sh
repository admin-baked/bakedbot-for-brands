#!/bin/bash

# CannPay Sandbox Credentials Setup Script
# This script configures Firebase Secret Manager with CannPay sandbox credentials
# Run this script from the project root directory

set -e

PROJECT_ID="studio-567050101-bc6e8"

echo "🔐 Setting up CannPay Sandbox credentials in Firebase Secret Manager..."
echo "Project: $PROJECT_ID"
echo ""

# Set Integrator ID
echo "📝 Setting CANPAY_INTEGRATOR_ID..."
echo -n "8954cd15" | gcloud secrets versions add CANPAY_INTEGRATOR_ID \
  --project=$PROJECT_ID \
  --data-file=-

echo "✅ CANPAY_INTEGRATOR_ID set"

# Set App Key
echo "📝 Setting CANPAY_APP_KEY..."
echo -n "BaKxozke8" | gcloud secrets versions add CANPAY_APP_KEY \
  --project=$PROJECT_ID \
  --data-file=-

echo "✅ CANPAY_APP_KEY set"

# Set API Secret
echo "📝 Setting CANPAY_API_SECRET..."
echo -n "7acfs2il" | gcloud secrets versions add CANPAY_API_SECRET \
  --project=$PROJECT_ID \
  --data-file=-

echo "✅ CANPAY_API_SECRET set"

echo ""
echo "🎉 CannPay Sandbox credentials configured successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy to Firebase: git push origin main"
echo "2. Test payment flow at: https://bakedbot.ai/thrivesyracuse"
echo "3. Use test consumer: Phone 555-779-4523, PIN 2222"
echo ""
