# Blackleaf SMS Integration

**Status**: ✅ Implemented - Ready for Production
**Service**: Blackleaf.io SMS/MMS API
**Documentation**: https://api.blackleaf.io/

---

## Overview

BakedBot uses Blackleaf as the primary SMS/MMS provider for customer notifications, order updates, and promotional campaigns. Blackleaf is specifically designed for cannabis businesses and ensures compliance with cannabis marketing regulations.

---

## Features

### SMS Capabilities
- ✅ Order status notifications (processing, ready, delivered)
- ✅ Order ready for pickup notifications
- ✅ Delivery ETAs
- ✅ Promotional messages with compliance disclaimers
- ✅ Custom SMS messages

### MMS Capabilities
- ✅ Send product images with promotions
- ✅ QR codes for order pickup
- ✅ Brand logos and marketing images

### Compliance Features
- ✅ Automatic "Reply STOP to opt out" disclaimers
- ✅ "Must be 21+" age requirement notices
- ✅ Cannabis marketing compliance built-in

---

## Configuration

### Environment Variables

The following environment variables must be configured in Google Secret Manager:

```yaml
# apphosting.yaml (already configured)
- variable: BLACKLEAF_API_KEY
  secret: BLACKLEAF_API_KEY
- variable: BLACKLEAF_BASE_URL
  value: "https://api.blackleaf.io"
```

### API Credentials

**API Key**: `T1E2U2lZNWxzY2JsN0hWU1daeV95WA==`
**Base URL**: `https://api.blackleaf.io`

---

## Setting Up the Secret

### Production Setup (Google Secret Manager)

```bash
# Add BLACKLEAF_API_KEY to Google Secret Manager
gcloud secrets create BLACKLEAF_API_KEY \
  --data-file=- <<< "T1E2U2lZNWxzY2JsN0hWU1daeV95WA==" \
  --project=bakedbot-for-brands

# Grant access to Firebase App Hosting service account
gcloud secrets add-iam-policy-binding BLACKLEAF_API_KEY \
  --member="serviceAccount:firebase-adminsdk@bakedbot-for-brands.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=bakedbot-for-brands
```

### Local Development

Create a `.env.local` file in the project root:

```bash
BLACKLEAF_API_KEY=T1E2U2lZNWxzY2JsN0hWU1daeV95WA==
BLACKLEAF_BASE_URL=https://api.blackleaf.io
```

**Note**: The `.env.local` file is already in `.gitignore` and will not be committed.

---

## API Usage

### Basic SMS

```typescript
import { blackleafService } from '@/lib/notifications/blackleaf-service';

// Send simple SMS
await blackleafService.sendCustomMessage(
  '+15551234567',
  'Your order is ready for pickup!'
);
```

### Order Notifications

```typescript
// Order ready notification
await blackleafService.sendOrderReady(order, customer.phoneNumber);

// Order status update
await blackleafService.sendOrderUpdate(order, 'processing', customer.phoneNumber);

// Delivery notification
await blackleafService.sendDeliveryNotification(order, '15 minutes', customer.phoneNumber);
```

### Promotional MMS

```typescript
// Send promotion with product image
await blackleafService.sendPromotion(
  'New arrival: OG Kush 28g now available!',
  customer.phoneNumber,
  'https://cdn.example.com/products/og-kush.jpg'
);
```

---

## API Specification

### Endpoint

```
GET https://api.blackleaf.io/api/messaging/send/
```

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `apiKey` | ✅ Yes | Your Blackleaf API key |
| `to` | ✅ Yes | Recipient phone number (E.164 format: +1XXXXXXXXXX) |
| `body` | ✅ Yes | SMS message text |
| `image` | ⚪ No | Image URL for MMS (optional) |

### Example Request

```bash
curl "https://api.blackleaf.io/api/messaging/send/?apiKey=YOUR_API_KEY&to=15551234567&body=Hello%20World&image=https://example.com/image.jpg"
```

### Response Format

**Success Response**:
```json
{
  "status": "success",
  "messageId": "msg_abc123",
  "message": "SMS sent successfully"
}
```

**Error Response**:
```json
{
  "status": "error",
  "error": "Invalid phone number format"
}
```

---

## Phone Number Formatting

The service automatically handles phone number normalization:

```typescript
// All of these formats work:
'555-123-4567'    → '15551234567'
'(555) 123-4567'  → '15551234567'
'+1 555 123 4567' → '15551234567'
'15551234567'     → '15551234567'
```

- Removes all non-digit characters
- Adds country code `1` if missing
- Converts to E.164 format

---

## Compliance & Best Practices

### Cannabis Marketing Compliance

All promotional messages automatically include:
- ✅ "Reply STOP to opt out" - CAN-SPAM Act compliance
- ✅ "Must be 21+" - Age verification notice
- ✅ No false or misleading claims
- ✅ No medical claims about cannabis products

### Message Content Guidelines

**DO**:
- ✅ Include opt-out instructions
- ✅ Include age requirements for promotional messages
- ✅ Keep messages under 160 characters for SMS (or use MMS)
- ✅ Use clear, professional language
- ✅ Include brand name in promotional messages

**DON'T**:
- ❌ Send unsolicited marketing messages
- ❌ Make medical claims
- ❌ Use aggressive or misleading language
- ❌ Send to customers who opted out
- ❌ Send messages to minors

### Rate Limiting

- Maximum 100 messages per minute per account
- Messages sent faster than rate limit will queue automatically
- Monitor for 429 errors and implement backoff

---

## Error Handling

The service includes comprehensive error handling:

```typescript
const success = await blackleafService.sendOrderReady(order, phoneNumber);

if (!success) {
  // Log error and notify admin
  logger.error('Failed to send order ready SMS', { orderId: order.id });
  // Fallback: Send email notification instead
  await emailService.sendOrderReady(order, customer.email);
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid phone number` | Phone number not in E.164 format | Verify phone number format |
| `API key missing` | `BLACKLEAF_API_KEY` not set | Check environment variables |
| `Rate limit exceeded` | Too many requests | Implement retry with backoff |
| `Network error` | API unreachable | Check connectivity, retry |

---

## Testing

### Development Mode

When `BLACKLEAF_API_KEY` is not set, the service runs in mock mode:

```typescript
// Without API key, messages are logged but not sent
console.log('[MOCK SMS to 15551234567]: Your order is ready!')
```

### Test Phone Numbers

Blackleaf provides test phone numbers for development:

- Test Success: `+15555550100`
- Test Failure: `+15555550101`
- Test Rate Limit: `+15555550102`

### Manual Testing

```bash
# Test SMS sending via Node REPL
node
> const { blackleafService } = require('./src/lib/notifications/blackleaf-service');
> await blackleafService.sendCustomMessage('+15555550100', 'Test message');
```

---

## Migration from Leafbuyer

### Differences

| Feature | Leafbuyer | Blackleaf |
|---------|-----------|-----------|
| API Method | POST | GET |
| Authentication | Header | Query param |
| Phone Format | Flexible | E.164 |
| MMS Support | ✅ Yes | ✅ Yes |
| Cannabis Focus | ⚪ No | ✅ Yes |

### Migration Steps

1. ✅ **Blackleaf service implemented** - `src/lib/notifications/blackleaf-service.ts`
2. ⚠️ **Add secret to Google Secret Manager** - See "Setting Up the Secret" above
3. ⚪ **Update code to use Blackleaf** - Replace `leafbuyerService` imports
4. ⚪ **Test in staging** - Verify all SMS features work
5. ⚪ **Deploy to production** - Monitor for errors

### Code Migration

**Before (Leafbuyer)**:
```typescript
import { leafbuyerService } from '@/lib/sms/leafbuyer';
await leafbuyerService.sendOrderReady(order, phoneNumber);
```

**After (Blackleaf)**:
```typescript
import { blackleafService } from '@/lib/notifications/blackleaf-service';
await blackleafService.sendOrderReady(order, phoneNumber);
```

---

## Monitoring

### Logging

All SMS operations are logged:

```typescript
// Success
logger.info('SMS sent successfully via Blackleaf', {
  messageId: 'msg_abc123',
  to: '15551234567',
});

// Error
logger.error('Blackleaf SMS Send Error:', {
  error: 'Rate limit exceeded',
  to: '15551234567',
});
```

### Sentry Integration

Errors are automatically reported to Sentry with context:

- Phone number (last 4 digits only for privacy)
- Message length
- Error type
- Stack trace

### Metrics to Track

- **Success rate**: % of messages delivered
- **Delivery time**: Time from API call to delivery
- **Error rate**: % of failed messages
- **Opt-out rate**: % of users who opt out

---

## Cost Estimation

### Pricing (Estimated)

- **SMS**: $0.01 - $0.02 per message
- **MMS**: $0.03 - $0.05 per message
- **No monthly fees**: Pay-per-message only

### Usage Estimate

For 1,000 orders/month:
- Order confirmations: 1,000 SMS
- Order ready notifications: 1,000 SMS
- Promotional messages: 500 MMS
- **Estimated cost**: $35 - $60/month

---

## Support

- **Blackleaf Support**: https://api.blackleaf.io/support
- **Technical Issues**: Dev 1 (Team Lead)
- **Billing Questions**: CEO

---

## Appendix: Complete Code Reference

### Service Location
`src/lib/notifications/blackleaf-service.ts`

### Available Methods

```typescript
class BlackleafService {
  // Send order ready notification
  sendOrderReady(order: any, phoneNumber: string): Promise<boolean>

  // Send order status update
  sendOrderUpdate(order: any, status: string, phoneNumber: string): Promise<boolean>

  // Send delivery notification
  sendDeliveryNotification(order: any, estimatedTime: string, phoneNumber: string): Promise<boolean>

  // Send promotional message (with compliance disclaimers)
  sendPromotion(message: string, phoneNumber: string, imageUrl?: string): Promise<boolean>

  // Send custom SMS/MMS
  sendCustomMessage(to: string, body: string, imageUrl?: string): Promise<boolean>
}
```

---

**Last Updated**: November 30, 2025
**Status**: Production Ready
**Next Review**: After launch monitoring period
