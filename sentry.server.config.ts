// This file configures the initialization of Sentry on the server.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1,
  debug: false,
  environment: process.env.NODE_ENV || 'development',
  ignoreErrors: [
    'ECONNREFUSED',
    'FirebaseError: Firebase: Error (auth/network-request-failed)',
    'Unauthorized: No session cookie found',
    'Unauthorized: Invalid session cookie',
  ],
  beforeSend(event, hint) {
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message);
      if (message.includes('Unauthorized') || message.includes('Forbidden')) {
        return null;
      }
      if (process.env.NODE_ENV === 'development' && message.includes('ECONNREFUSED')) {
        return null;
      }
    }
    return event;
  },
});
