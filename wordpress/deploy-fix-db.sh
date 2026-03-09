#!/bin/bash

# Set project
gcloud config set project studio-567050101-bc6e8

# Build the Docker image
echo "Building Docker image..."
gcloud builds submit . --tag=gcr.io/studio-567050101-bc6e8/andrews-wp:fix-db

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy andrews-wp \
  --image=gcr.io/studio-567050101-bc6e8/andrews-wp:fix-db \
  --platform=managed \
  --region=us-central1 \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars=PHP_UPLOAD_LIMIT=64M,WP_HOME=https://andrews-wp-1016399212569.us-central1.run.app,WP_SITEURL=https://andrews-wp-1016399212569.us-central1.run.app \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=3 \
  --timeout=300s \
  --set-env-vars=WORDPRESS_DB_HOST=cloudsql-proxy:3306,WORDPRESS_DB_NAME=andrews-wp-db,WORDPRESS_DB_USER=wpadmin,WORDPRESS_DB_PASSWORD="${_DB_PASSWORD}"

echo "Deployment complete!"