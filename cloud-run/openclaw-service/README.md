# OpenClaw REST API Wrapper

REST API wrapper for OpenClaw CLI, providing HTTP endpoints for WhatsApp gateway integration.

## Quick Start

### 1. Install Dependencies
```bash
cd cloud-run/openclaw-service
npm install
```

### 2. Start the Service
```bash
# Development (uses default API key)
npm start

# Production (with custom API key)
OPENCLAW_API_KEY=your-secure-key npm start
```

The server will start on **http://localhost:3001**

### 3. Test the Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Check session status (requires auth)
curl -H "Authorization: Bearer dev-key-12345" \
  http://localhost:3001/whatsapp/session/status

# Send a message
curl -X POST http://localhost:3001/whatsapp/message/send \
  -H "Authorization: Bearer dev-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Hello from BakedBot!"}'
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| GET | `/whatsapp/session/status` | Get WhatsApp connection status |
| POST | `/whatsapp/session/qr` | Generate QR code for auth |
| POST | `/whatsapp/session/disconnect` | Disconnect WhatsApp |
| POST | `/whatsapp/message/send` | Send WhatsApp message |
| POST | `/whatsapp/message/history` | Get message history |

## Environment Variables

- `PORT` - Server port (default: 3001)
- `OPENCLAW_API_KEY` - API key for authentication (default: dev-key-12345)

## Authentication

All endpoints (except `/health`) require Bearer token authentication:

```
Authorization: Bearer <OPENCLAW_API_KEY>
```

## Integration with BakedBot

1. Start this service: `npm start`
2. Set environment variables in BakedBot:
   ```
   OPENCLAW_API_URL=http://localhost:3001
   OPENCLAW_API_KEY=dev-key-12345
   ```
3. Navigate to `/dashboard/ceo?tab=whatsapp`

## Production Features

- ✅ **QR Code Generation**: Real QR codes generated via whatsapp-web.js
- ✅ **Session Persistence**: Uses Firestore RemoteAuth - sessions survive container restarts
- ✅ **Message History**: Full message history from WhatsApp chats
- ✅ **Auto-reconnect**: Automatically restores session from Firestore on cold starts

## Session Storage

WhatsApp session data is stored in Firestore collection `whatsapp-sessions`:
- **Persistent across container restarts** (no QR scan needed after initial auth)
- **Automatic backups** every 60 seconds
- **Cloud-native** session management

## Production Deployment

See `Dockerfile` for containerized deployment to Cloud Run.
