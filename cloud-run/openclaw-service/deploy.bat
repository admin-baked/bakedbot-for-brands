@echo off
echo ===========================================
echo   WhatsApp Gateway - Cloud Run Deployment
echo ===========================================
echo.

set PROJECT_ID=bakedbot-agents
set SERVICE_NAME=whatsapp-gateway
set REGION=us-central1

echo Project: %PROJECT_ID%
echo Service: %SERVICE_NAME%
echo Region: %REGION%
echo.

echo [1/3] Building and pushing Docker image...
gcloud builds submit --tag gcr.io/%PROJECT_ID%/%SERVICE_NAME% --project=%PROJECT_ID%

if errorlevel 1 (
    echo ERROR: Docker build failed
    exit /b 1
)

echo.
echo [2/3] Deploying to Cloud Run...
gcloud run deploy %SERVICE_NAME% ^
    --image gcr.io/%PROJECT_ID%/%SERVICE_NAME% ^
    --platform managed ^
    --region %REGION% ^
    --memory 2Gi ^
    --cpu 2 ^
    --timeout 300 ^
    --max-instances 1 ^
    --min-instances 0 ^
    --allow-unauthenticated ^
    --set-env-vars NODE_ENV=production ^
    --project=%PROJECT_ID%

if errorlevel 1 (
    echo ERROR: Cloud Run deployment failed
    exit /b 1
)

echo.
echo [3/3] Getting service URL...
for /f "tokens=*" %%i in ('gcloud run services describe %SERVICE_NAME% --platform managed --region %REGION% --format "value(status.url)" --project=%PROJECT_ID%') do set SERVICE_URL=%%i

echo.
echo ===========================================
echo   Deployment Complete!
echo ===========================================
echo Service URL: %SERVICE_URL%
echo.
echo Next steps:
echo 1. Create secret for OPENCLAW_API_URL with value: %SERVICE_URL%
echo 2. Create secret for OPENCLAW_API_KEY with a secure random key
echo 3. Test the service: curl %SERVICE_URL%/health
echo.
pause
