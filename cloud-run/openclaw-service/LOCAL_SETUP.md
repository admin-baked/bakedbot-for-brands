# OpenClaw Local Setup Guide

## Quick Start

### 1. Start the REST Wrapper

```bash
cd cloud-run/openclaw-service
npm install
npm start
```

The wrapper runs on **http://localhost:3001**

### 2. Configure WhatsApp

Link your WhatsApp account:

```bash
openclaw channels login
```

Scan the QR code with WhatsApp (Settings → Linked Devices → Link a Device).

### 3. Configure BakedBot

Environment variables are already set in `.env.local`:

```env
OPENCLAW_API_URL=http://localhost:3001
OPENCLAW_API_KEY=dev-key-12345
```

### 4. Start BakedBot

```bash
npm run dev
```

### 5. Access WhatsApp Tab

Navigate to: **http://localhost:3000/dashboard/ceo?tab=whatsapp**

Login as Super User:
- Email: `martez@bakedbot.ai`
- Password: (from .env.local)

## Testing

### Test REST Wrapper Endpoints

```bash
# Health check (no auth)
curl http://localhost:3001/health

# Session status (requires auth)
curl -H "Authorization: Bearer dev-key-12345" \
  http://localhost:3001/whatsapp/session/status

# Send message (requires WhatsApp connected)
curl -X POST http://localhost:3001/whatsapp/message/send \
  -H "Authorization: Bearer dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test from BakedBot!"}'
```

### Test from BakedBot UI

1. Navigate to CEO Dashboard → WhatsApp tab
2. Click "Connect" to link WhatsApp (if not already connected)
3. Send a test message using the form
4. Try bulk campaign with multiple recipients

## Troubleshooting

### REST Wrapper Not Responding

```bash
# Check if wrapper is running
netstat -ano | findstr ":3001"

# Restart wrapper
cd cloud-run/openclaw-service
npm start
```

### OpenClaw Gateway Not Reachable

```bash
# Check gateway status
openclaw status

# Check gateway health
openclaw health

# Verify gateway is on port 18789
netstat -ano | findstr ":18789"
```

### WhatsApp Not Connected

```bash
# Check channel status
openclaw channels status

# Re-login
openclaw channels login
```

## Architecture

```
BakedBot (localhost:3000)          OpenClaw Service (localhost:3001)
  CEO Dashboard                      Express/Gateway Server
       ↓                                      ↓
  Server Actions                      OpenClaw CLI Commands
       ↓                                      ↓
  OpenClaw Client  ←──── HTTP ────→   WhatsApp Web Protocol
```

## Production Deployment

See main [README.md](README.md) for Cloud Run deployment instructions.
