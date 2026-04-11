#!/bin/bash
# deploy-qa-runner.sh — Build and deploy the QA Runner Cloud Run Job
#
# This creates a fully autonomous Playwright test runner that runs in the cloud.
# No laptop required. Triggered by Cloud Scheduler or manual gcloud command.
#
# Usage:
#   bash scripts/deploy-qa-runner.sh
#   bash scripts/deploy-qa-runner.sh --trigger    # Deploy + trigger a test run

set -euo pipefail

PROJECT_ID="studio-567050101-bc6e8"
REGION="us-central1"
JOB_NAME="qa-runner"
IMAGE="gcr.io/${PROJECT_ID}/${JOB_NAME}"
DOCKER_DIR="docker/qa-runner"
PROD_URL="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app"

echo "=== Deploying QA Runner Cloud Run Job ==="
echo "Project: $PROJECT_ID | Region: $REGION"
echo ""

# Step 1: Copy test files into the Docker build context
echo "1. Preparing build context..."
rm -rf "${DOCKER_DIR}/tests"
mkdir -p "${DOCKER_DIR}/tests/e2e/ci-smoke"

# Copy the CI smoke tests (these are the maintained, deterministic tests)
cp tests/e2e/ci-smoke/*.spec.ts "${DOCKER_DIR}/tests/e2e/ci-smoke/" 2>/dev/null || true

# Copy generated tests if they exist
if [ -d "tests/e2e/generated" ] && [ "$(ls tests/e2e/generated/*.spec.ts 2>/dev/null)" ]; then
    mkdir -p "${DOCKER_DIR}/tests/e2e/generated"
    cp tests/e2e/generated/*.spec.ts "${DOCKER_DIR}/tests/e2e/generated/"
    echo "   Copied $(ls tests/e2e/generated/*.spec.ts | wc -l) generated specs"
fi

echo "   Copied $(find ${DOCKER_DIR}/tests -name '*.spec.ts' | wc -l) total test files"

# Step 2: Build and push the container
echo ""
echo "2. Building container..."
gcloud builds submit \
    --tag "$IMAGE" \
    --project "$PROJECT_ID" \
    "$DOCKER_DIR"

# Step 3: Create or update the Cloud Run Job
echo ""
echo "3. Creating/updating Cloud Run Job..."
gcloud run jobs create "$JOB_NAME" \
    --image "$IMAGE" \
    --region "$REGION" \
    --task-timeout 300s \
    --max-retries 1 \
    --set-env-vars "BASE_URL=${PROD_URL}" \
    --set-secrets "CRON_SECRET=CRON_SECRET:latest,SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest" \
    --memory 2Gi \
    --cpu 2 \
    --project "$PROJECT_ID" \
    2>/dev/null || \
gcloud run jobs update "$JOB_NAME" \
    --image "$IMAGE" \
    --region "$REGION" \
    --task-timeout 300s \
    --max-retries 1 \
    --set-env-vars "BASE_URL=${PROD_URL}" \
    --set-secrets "CRON_SECRET=CRON_SECRET:latest,SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest,FIREBASE_SERVICE_ACCOUNT_KEY=FIREBASE_SERVICE_ACCOUNT_KEY:latest" \
    --memory 2Gi \
    --cpu 2 \
    --project "$PROJECT_ID"

echo ""
echo "=== QA Runner Deployed ==="
echo ""
echo "Trigger a test run:"
echo "  gcloud run jobs execute $JOB_NAME --region $REGION --project $PROJECT_ID"
echo ""
echo "Schedule nightly (add to Cloud Scheduler):"
echo "  gcloud scheduler jobs create http nightly-e2e-tests \\"
echo "    --location $REGION \\"
echo "    --schedule '30 2 * * *' \\"
echo "    --uri 'https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/$JOB_NAME:run' \\"
echo "    --http-method POST \\"
echo "    --oauth-service-account-email claude-scheduler-admin@${PROJECT_ID}.iam.gserviceaccount.com \\"
echo "    --time-zone 'America/Chicago' \\"
echo "    --project $PROJECT_ID"

# Optional: trigger immediately
if [[ "${1:-}" == "--trigger" ]]; then
    echo ""
    echo "Triggering test run..."
    gcloud run jobs execute "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" --async
    echo "Job triggered! Check logs:"
    echo "  gcloud run jobs executions list --job $JOB_NAME --region $REGION --project $PROJECT_ID"
fi
