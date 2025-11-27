# Custom Domain Setup Guide

## Firebase Hosting Custom Domain

### 1. Add Custom Domain in Firebase Console

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain (e.g., `brandss.bakedbot.ai`)
4. Follow verification steps

### 2. DNS Configuration

Add these records to your DNS provider:

```
Type: A
Name: @ (or brandss)
Value: [Firebase IP addresses provided]

Type: TXT
Name: @ (or brandss)
Value: [Verification code from Firebase]
```

### 3. SSL Certificate

Firebase automatically provisions SSL certificates via Let's Encrypt.
This may take up to 24 hours.

### 4. Verify Setup

```bash
# Check DNS propagation
nslookup brandss.bakedbot.ai

# Test HTTPS
curl -I https://brandss.bakedbot.ai
```

## Environment Variables for Custom Domain

Update `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=https://brandss.bakedbot.ai
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=brandss.bakedbot.ai
```

## Redirect Configuration

In `firebase.json`:

```json
{
  "hosting": {
    "public": "out",
    "cleanUrls": true,
    "trailingSlash": false,
    "redirects": [
      {
        "source": "/",
        "destination": "/dashboard",
        "type": 301
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

## Testing

1. Clear browser cache
2. Visit https://brandss.bakedbot.ai
3. Verify SSL certificate is valid
4. Test all critical flows
5. Check PWA install prompt
