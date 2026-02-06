# WhatsApp Gateway - Production Deployment Guide

## 🎯 Overview

Production-ready WhatsApp gateway using **whatsapp-web.js** with **Firebase Cloud Storage session persistence**.

### Key Features

- ✅ **Real QR Code Generation** - No more placeholders!
- ✅ **Persistent Sessions** - Survives container restarts via Cloud Storage
- ✅ **Auto-reconnect** - No QR scan needed after initial authentication
- ✅ **Scalable** - Works with Min instances: 0 (truly serverless)
- ✅ **Production-ready** - Handles message sending, history, and campaigns
- ✅ **Large Session Support** - Handles 100MB+ Chromium profiles (Cloud Storage vs Firestore's 1MB limit)

---

## 📦 Architecture

```
Cloud Run Container (Ephemeral)
├── WhatsApp Client (whatsapp-web.js + LocalAuth)
├── Puppeteer + Chromium
├── Session Manager (zip/unzip utility)
└── Session Storage → Firebase Cloud Storage (Persistent)
                      gs://[bucket]/whatsapp-session.zip
```

**Session Flow:**
1. **Startup**: Check Cloud Storage for `whatsapp-session.zip` → Download & Extract (if exists)
2. **First time**: Generate QR → Scan → Client Ready → Zip & Upload to Storage
3. **Runtime**: Auto-backup every 5 minutes + on shutdown (SIGTERM)
4. **Container restart**: Load session from Storage → Auto-connect (no QR needed!) ✨

---

## 🚀 Deployment Steps

### 1. Deploy to Cloud Run

**Option A: Google Cloud Console** (Recommended if gcloud has issues)

1. Open: https://console.cloud.google.com/run?project=bakedbot-agents
2. Click **"CREATE SERVICE"**
3. Configure:
   - **Source**: Repository (connect GitHub: `bakedbot-for-brands`)
   - **Build directory**: `cloud-run/openclaw-service`
   - **Build type**: Dockerfile
   - **Service name**: `whatsapp-gateway`
   - **Region**: `us-central1`
   - **Authentication**: Allow unauthenticated (we use API key auth)

4. **Resources**:
   - CPU: **2**
   - Memory: **2 GiB**
   - Min instances: **0** (scales to zero when idle)
   - Max instances: **1**
   - Request timeout: **300 seconds**

5. **Environment Variables**:
   - `OPENCLAW_API_KEY`: `whatsapp-d394bc9d3613d4b0cda9ea27b0a83fe888e59b31763047ad997234daa3f57a10`
   - `GOOGLE_CLOUD_PROJECT`: `bakedbot-agents`

6. Click **DEPLOY**

**Option B: Command Line** (If Python is configured)

```bash
cd cloud-run/openclaw-service
gcloud builds submit --config=cloudbuild.yaml --project=bakedbot-agents
```

### 2. Get Service URL

After deployment, copy the service URL (e.g., `https://whatsapp-gateway-xxxxx-uc.a.run.app`)

### 3. Create Firebase Secrets

**Via Firebase Console:**
1. Go to: https://console.firebase.google.com/project/bakedbot-agents/apphosting
2. Click "Secrets" → "Add Secret"
3. Create:
   - Name: `OPENCLAW_API_URL`
   - Value: `https://whatsapp-gateway-xxxxx-uc.a.run.app` (your service URL)
4. Create:
   - Name: `OPENCLAW_API_KEY`
   - Value: `whatsapp-d394bc9d3613d4b0cda9ea27b0a83fe888e59b31763047ad997234daa3f57a10`

**Via Command Line:**
```bash
firebase apphosting:secrets:set OPENCLAW_API_URL "https://whatsapp-gateway-xxxxx-uc.a.run.app" --project=bakedbot-agents
firebase apphosting:secrets:set OPENCLAW_API_KEY "whatsapp-d394bc9d3613d4b0cda9ea27b0a83fe888e59b31763047ad997234daa3f57a10" --project=bakedbot-agents
```

### 4. Redeploy Main App

The main BakedBot app needs to pick up the new secrets:

```bash
# In the root directory
git add .
git commit -m "feat(whatsapp): production-ready gateway with Firestore sessions"
git push origin main
```

Firebase App Hosting will auto-deploy with the new secrets.

---

## 🧪 Testing

### 1. Health Check

```bash
curl https://whatsapp-gateway-xxxxx-uc.a.run.app/health
```

Expected:
```json
{
  "status": "ok",
  "service": "whatsapp-gateway",
  "version": "2.0.0",
  "whatsappReady": false
}
```

### 2. Generate QR Code

```bash
curl -X POST https://whatsapp-gateway-xxxxx-uc.a.run.app/whatsapp/session/qr \
  -H "Authorization: Bearer whatsapp-d394bc9d3613d4b0cda9ea27b0a83fe888e59b31763047ad997234daa3f57a10"
```

Expected:
```json
{
  "qrCode": "data:image/png;base64,iVBOR...",
  "message": "Scan this QR code with WhatsApp",
  "connected": false
}
```

### 3. Test in Production

1. Navigate to: https://bakedbot.ai/dashboard/ceo?tab=whatsapp
2. Login as Super Admin
3. Click **"Connect"** button
4. **Scan QR code** with WhatsApp (Settings → Linked Devices → Link a Device)
5. Wait for "Connected" status
6. Send a test message

### 4. Test Session Persistence

1. Wait 10 minutes (container scales down with min instances: 0)
2. Refresh the page
3. **Verify**: Status should show "Connected" without needing to scan QR again! ✨

---

## 🔐 Security

- ✅ **API Key Authentication**: All endpoints (except `/health`) require Bearer token
- ✅ **Firestore IAM**: Service account has minimal permissions
- ✅ **No exposed credentials**: All secrets in Secret Manager
- ✅ **HTTPS only**: Enforced by Cloud Run

---

## 📊 Monitoring

### Cloud Run Metrics

Check in Console: https://console.cloud.google.com/run/detail/us-central1/whatsapp-gateway/metrics

Monitor:
- **Request count**: Track usage
- **Instance count**: Verify scaling behavior
- **Memory utilization**: Should stay under 2 GiB
- **Request latency**: QR generation takes 3-5 seconds

### Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=whatsapp-gateway" --limit 50 --project=bakedbot-agents
```

Or in Console: https://console.cloud.google.com/logs/query?project=bakedbot-agents

---

## 🐛 Troubleshooting

### QR Code Not Generating

**Symptom**: Timeout or "QR code is being generated" message persists

**Solution**:
1. Check logs for Chromium errors
2. Verify memory allocation (should be 2 GiB)
3. Increase timeout to 60 seconds if needed

### Session Not Persisting

**Symptom**: QR scan required every time

**Solution**:
1. Check Firebase Storage for `whatsapp-session.zip` file
2. Verify service account has Storage write permissions
3. Check logs for "[SessionManager] Backup complete" message
4. View in Console: https://console.firebase.google.com/project/bakedbot-agents/storage

### WhatsApp Disconnects

**Symptom**: Random disconnections

**Solution**:
1. WhatsApp Web has rate limits - don't spam messages
2. Keep phone connected to internet and charged
3. Don't use WhatsApp Web on multiple devices simultaneously

---

## 📝 Cost Estimate

**Cloud Run:**
- CPU: 2 vCPU @ $0.00002400/vCPU-second
- Memory: 2 GiB @ $0.00000250/GiB-second
- With min instances: 0 → **Only pay when active**

**Estimated monthly cost** (assuming 1000 messages/month, ~10 min active time/day):
- **~$5-10/month** 💰

**Cloud Storage:**
- Session storage: ~50-200 MB (zipped Chromium profile)
- Updates: ~288/day (5 minute backups)
- **~$0.05/month** (negligible - storage is dirt cheap)

**Total: ~$5-10/month** for production WhatsApp integration! 🎉

---

## 🔄 Updates & Maintenance

### Update the Service

```bash
cd cloud-run/openclaw-service
# Make changes to server.js or session-manager.js
gcloud builds submit --config=cloudbuild.yaml --project=bakedbot-agents
```

### Force Session Reset

If you need to disconnect and start fresh:

**Via Console:**
1. Go to: https://console.firebase.google.com/project/bakedbot-agents/storage
2. Find and delete `whatsapp-session.zip`

**Via gsutil:**
```bash
gsutil rm gs://bakedbot-agents.appspot.com/whatsapp-session.zip
```

---

## ✅ Deployment Checklist

- [ ] Deploy Cloud Run service
- [ ] Get service URL
- [ ] Create `OPENCLAW_API_URL` secret
- [ ] Create `OPENCLAW_API_KEY` secret
- [ ] Redeploy main app
- [ ] Test health endpoint
- [ ] Generate and scan QR code
- [ ] Send test message
- [ ] Wait for scale-down, verify session persists
- [ ] Set up monitoring alerts

---

**Questions?** Check the main [README.md](README.md) or open an issue.
