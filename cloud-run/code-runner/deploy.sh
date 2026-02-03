#!/bin/bash

# BakedBot Code Runner - Cloud Run Deployment Script
#
# Usage:
#   ./deploy.sh [environment]
#
# Arguments:
#   environment - prod (default) or staging

set -e

# Configuration
PROJECT_ID="bakedbot-ai"
SERVICE_NAME="bakedbot-code-runner"
REGION="us-central1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Parse arguments
ENVIRONMENT="${1:-prod}"

echo "🚀 Deploying BakedBot Code Runner to Cloud Run"
echo "   Environment: ${ENVIRONMENT}"
echo "   Project: ${PROJECT_ID}"
echo "   Service: ${SERVICE_NAME}"
echo "   Region: ${REGION}"
echo ""

# Verify gcloud is configured
if ! gcloud config get-value project > /dev/null 2>&1; then
    echo "❌ Error: gcloud is not configured. Run 'gcloud auth login' first."
    exit 1
fi

# Set project
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "📦 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com

# Build Docker image
echo ""
echo "🔨 Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo ""
echo "☁️  Deploying to Cloud Run..."

if [ "${ENVIRONMENT}" = "prod" ]; then
    gcloud run deploy ${SERVICE_NAME} \
        --image ${IMAGE_NAME} \
        --platform managed \
        --region ${REGION} \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --timeout 30s \
        --max-instances 100 \
        --min-instances 0 \
        --concurrency 80 \
        --set-env-vars "NODE_ENV=production,ALLOWED_ORIGINS=https://bakedbot.ai" \
        --no-cpu-throttling
else
    # Staging environment
    gcloud run deploy ${SERVICE_NAME}-staging \
        --image ${IMAGE_NAME} \
        --platform managed \
        --region ${REGION} \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --timeout 30s \
        --max-instances 10 \
        --min-instances 0 \
        --concurrency 20 \
        --set-env-vars "NODE_ENV=staging,ALLOWED_ORIGINS=https://staging.bakedbot.ai,http://localhost:3000" \
        --no-cpu-throttling
fi

# Get service URL
echo ""
echo "✅ Deployment complete!"
echo ""

if [ "${ENVIRONMENT}" = "prod" ]; then
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')
else
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME}-staging --region ${REGION} --format 'value(status.url)')
fi

echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "📋 Next Steps:"
echo "   1. Test the service: curl ${SERVICE_URL}/health"
echo "   2. Update NEXT_PUBLIC_CODE_RUNNER_URL in .env"
echo "   3. Test code execution from training dashboard"
echo ""
echo "💡 To view logs:"
echo "   gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"
