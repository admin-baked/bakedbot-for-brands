# QA Runner — Cloud Run Job container with Playwright
#
# Runs E2E tests against production (no local dev server needed).
# Triggered by Cloud Scheduler or Linus via Cloud Run Jobs API.
#
# Reports results to Firestore + Slack. Laptop not required.
#
# Build:
#   docker build -t qa-runner docker/qa-runner/
#   gcloud builds submit --tag gcr.io/studio-567050101-bc6e8/qa-runner docker/qa-runner/
#
# Deploy as Cloud Run Job:
#   gcloud run jobs create qa-runner \
#     --image gcr.io/studio-567050101-bc6e8/qa-runner \
#     --region us-central1 \
#     --task-timeout 300s \
#     --max-retries 1 \
#     --set-env-vars "BASE_URL=https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app" \
#     --set-secrets "CRON_SECRET=CRON_SECRET:latest,SLACK_BOT_TOKEN=SLACK_BOT_TOKEN:latest" \
#     --project studio-567050101-bc6e8

# Use official Playwright image — all browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.49.1-noble

# Install Node.js deps
WORKDIR /app

# Copy package files for Playwright test runner
COPY package.json ./
RUN npm install --production

# Copy test files and runner
COPY playwright.config.ts ./
COPY tests/ ./tests/
COPY runner.mjs ./

# Default: run the QA suite
CMD ["node", "runner.mjs"]
