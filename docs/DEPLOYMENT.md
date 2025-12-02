# Deployment Verification Checklist

## Pre-Deployment

### Environment Variables
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY` set
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` set
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` set
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set
- [ ] `CANNMENUS_API_KEY` set
- [ ] `CANNMENUS_API_BASE` set

### Build Verification
```bash
npm run build
# Should complete without errors
# Check for:
# - No TypeScript errors
# - No lint errors
# - Successful static page generation
```

### Database
- [ ] Firestore indexes deployed: `firebase deploy --only firestore:indexes`
- [ ] Security rules reviewed
- [ ] Composite indexes for orders, products, analytics, chatSessions

## Post-Deployment

### Critical Flows
- [ ] Homepage loads
- [ ] Age gate appears on menu
- [ ] Age verification works (21+ check)
- [ ] Menu displays products
- [ ] Chatbot opens and responds
- [ ] Conversation memory persists
- [ ] Clear context button works
- [ ] Analytics dashboard loads
- [ ] Craig campaign wizard completes
- [ ] Checkout validation enforces age

### PWA
- [ ] Manifest accessible at `/manifest.json`
- [ ] Service worker registers
- [ ] Offline page works
- [ ] Install prompt appears (on supported browsers)

### Performance
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.8s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.8s
- [ ] Cumulative Layout Shift < 0.1

### Monitoring
- [ ] Sentry receiving errors
- [ ] Performance metrics tracked
- [ ] Console has no critical errors

### Security
- [ ] HTTPS enabled
- [ ] Age gate cannot be bypassed
- [ ] API routes protected
- [ ] Firebase security rules enforced

## Rollback Plan

If critical issues found:
1. Revert to previous deployment
2. Check error logs in Sentry
3. Review Firebase logs
4. Test locally with production env vars

## Success Criteria

✅ All critical flows work
✅ No console errors
✅ Performance metrics meet targets
✅ Compliance features active
✅ Monitoring operational
